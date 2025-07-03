import torch

from transformers import BertTokenizer
from transformers import BertForSequenceClassification, AdamW, BertConfig
from transformers import get_linear_schedule_with_warmup
from torch.utils.data import TensorDataset, DataLoader, RandomSampler, SequentialSampler
from keras_preprocessing.sequence import pad_sequences

from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, roc_auc_score, accuracy_score, hamming_loss
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.preprocessing import MultiLabelBinarizer
import pandas as pd
import numpy as np
import random
import time
import datetime
from tqdm import tqdm
from datasets import load_dataset
import csv
import os


from transformers import BartTokenizer, BartForSequenceClassification

def load_dataloader(max_length=128, batch_size=32):
    MAX_LEN = max_length

    train = load_dataset("jeanlee/kmhas_korean_hate_speech", split="train")
    validation = load_dataset("jeanlee/kmhas_korean_hate_speech", split="validation")
    test = load_dataset("jeanlee/kmhas_korean_hate_speech", split="test")
    train_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', train['text']))
    validation_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', validation['text']))
    test_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', test['text']))
    enc = MultiLabelBinarizer()

    def multi_label(example):
        enc_label = enc.fit_transform(example['label'])
        float_arr = np.vstack(enc_label[:]).astype(float)
        update_label = float_arr.tolist()
        return update_label

    train_labels = multi_label(train)
    validation_labels = multi_label(validation)
    test_labels = multi_label(test)
    tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased', do_lower_case=False)

    def data_to_tensor (sentences, labels):
        tokenized_texts = [tokenizer.tokenize(sent) for sent in sentences]
        input_ids = [tokenizer.convert_tokens_to_ids(x) for x in tokenized_texts]
        input_ids = pad_sequences(input_ids, maxlen=MAX_LEN, dtype="long", truncating="post", padding="post") 

        attention_masks = []

        for seq in input_ids:
            seq_mask = [float(i > 0) for i in seq]
            attention_masks.append(seq_mask)

        tensor_inputs = torch.tensor(input_ids)
        tensor_labels = torch.tensor(labels)
        tensor_masks = torch.tensor(attention_masks)

        return tensor_inputs, tensor_labels, tensor_masks
    
    train_inputs, train_labels, train_masks = data_to_tensor(train_sentences, train_labels)
    validation_inputs, validation_labels, validation_masks = data_to_tensor(validation_sentences, validation_labels)
    test_inputs, test_labels, test_masks = data_to_tensor(test_sentences, test_labels)

    train_data = TensorDataset(train_inputs, train_masks, train_labels)
    train_sampler = RandomSampler(train_data)
    train_dataloader = DataLoader(train_data, sampler=train_sampler, batch_size=batch_size)

    validation_data = TensorDataset(validation_inputs, validation_masks, validation_labels)
    validation_sampler = SequentialSampler(validation_data)
    validation_dataloader = DataLoader(validation_data, sampler=validation_sampler, batch_size=batch_size)

    test_data = TensorDataset(test_inputs, test_masks, test_labels)
    test_sampler = RandomSampler(test_data)
    test_dataloader = DataLoader(test_data, sampler=test_sampler, batch_size=batch_size)
    return train_dataloader, validation_dataloader, test_dataloader

def main(trial):
    # set_seed(args['seed'])
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    params = trial['params']
    train_dataloader, validation_dataloader, test_dataloader = load_dataloader(params['max_length'], params['batch_size'])

    num_labels = 9
    model = BertForSequenceClassification.from_pretrained("bert-base-multilingual-cased", 
                                                          num_labels=num_labels, 
                                                          problem_type="multi_label_classification", 
                                                          hidden_act=params['activation'],
                                                          hidden_dropout_prob = params['hidden_dropout_prob'],
                                                          attention_probs_dropout_prob = params['attention_probs_dropout_prob'],
                                                          position_embedding_type=params['position_embedding_type'],
                                                          is_decoder=params['is_decoder'],
                                                          classifier_dropout=params['classifier_dropout'],
                                                          )
    print(model.config)
    model.cuda()
    optimizer = AdamW(model.parameters(),
                  lr = params['learning_rate'],
                  eps = 1e-8
                )

    # change epochs for improving results (our paper : epochs = 4)
    epochs = trial['budget']
    total_steps = len(train_dataloader) * epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, 
                                                num_warmup_steps = 0,
                                                num_training_steps = total_steps)
    def format_time(elapsed):
        elapsed_rounded = int(round((elapsed)))
        return str(datetime.timedelta(seconds=elapsed_rounded))  # hh:mm:ss

    def multi_label_metrics(predictions, labels, threshold=0.5):
    
    # first, apply sigmoid on predictions which are of shape (batch_size, num_labels)
        sigmoid = torch.nn.Sigmoid()
        probs = sigmoid(torch.Tensor(predictions))

        # next, use threshold to turn them into integer predictions
        y_pred = np.zeros(probs.shape)
        y_pred[np.where(probs >= threshold)] = 1

        # finally, compute metrics
        y_true = labels
        accuracy = accuracy_score(y_true, y_pred)
        f1_macro_average = f1_score(y_true=y_true, y_pred=y_pred, average='macro', zero_division=0)
        f1_micro_average = f1_score(y_true=y_true, y_pred=y_pred, average='micro', zero_division=0)
        f1_weighted_average = f1_score(y_true=y_true, y_pred=y_pred, average='weighted', zero_division=0)
        roc_auc = roc_auc_score(y_true, y_pred, average = 'micro')
        hamming = hamming_loss(y_true, y_pred)

        # return as dictionary
        metrics = {'accuracy': accuracy,
                'f1_macro': f1_macro_average,
                'f1_micro': f1_micro_average,
                'f1_weighted': f1_weighted_average,
                'roc_auc': roc_auc,
                'hamming_loss': hamming}

        return metrics  
    

    seed_val = 42
    random.seed(seed_val)
    np.random.seed(seed_val)
    torch.manual_seed(seed_val)
    torch.cuda.manual_seed_all(seed_val)

    model.zero_grad()
    for epoch_i in range(0, epochs):
        
        # ========================================
        #               Training
        # ========================================
        
        print("")
        print('======== Epoch {:} / {:} ========'.format(epoch_i + 1, epochs))
        print('Training...')

        t0 = time.time()
        total_loss = 0

        model.train()

        for step, batch in tqdm(enumerate(train_dataloader)):
            if step % 500 == 0 and not step == 0:
                elapsed = format_time(time.time() - t0)
                print('  Batch {:>5,}  of  {:>5,}.    Elapsed: {:}.'.format(step, len(train_dataloader), elapsed))

            batch = tuple(t.to(device) for t in batch)
            b_input_ids, b_input_mask, b_labels = batch

            outputs = model(b_input_ids, 
                            token_type_ids=None, 
                            attention_mask=b_input_mask, 
                            labels=b_labels)
            
            loss = outputs[0]
            total_loss += loss.item()
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)  # gradient clipping if it is over a threshold
            optimizer.step()
            scheduler.step()

            model.zero_grad()

        avg_train_loss = total_loss / len(train_dataloader)            

        print("")
        print("  Average training loss: {0:.4f}".format(avg_train_loss))
        print("  Training epcoh took: {:}".format(format_time(time.time() - t0)))
        
    print("")
    print("Training complete!")

    # ========================================
    #               Validation
    # ========================================

    print("")
    print("Running Validation...")

    t0 = time.time()
    model.eval()
    accum_logits, accum_label_ids = [], []

    for batch in validation_dataloader:
        batch = tuple(t.to(device) for t in batch)
        b_input_ids, b_input_mask, b_labels = batch

        with torch.no_grad():
            outputs = model(b_input_ids, 
                            token_type_ids=None, 
                            attention_mask=b_input_mask)

        logits = outputs[0]
        logits = logits.detach().cpu().numpy()
        label_ids = b_labels.to('cpu').numpy()

        for b in logits:
            accum_logits.append(list(b))

        for b in label_ids:
            accum_label_ids.append(list(b))

    accum_logits = np.array(accum_logits)
    accum_label_ids = np.array(accum_label_ids)
    results = multi_label_metrics(accum_logits, accum_label_ids)

    print("Accuracy: {0:.4f}".format(results['accuracy']))
    print("F1 (Macro) Score: {0:.4f}".format(results['f1_macro']))
    print("F1 (Micro) Score: {0:.4f}".format(results['f1_micro']))
    print("F1 (Weighted) Score: {0:.4f}".format(results['f1_weighted']))
    print("ROC-AUC: {0:.4f}".format(results['roc_auc']))
    print("Hamming Loss: {0:.4f}".format(results['hamming_loss']))
    print("Validation took: {:}".format(format_time(time.time() - t0)))

    t0 = time.time()
    model.eval()
    accum_logits, accum_label_ids = [], []

    for step, batch in tqdm(enumerate(test_dataloader)):
        if step % 100 == 0 and not step == 0:
            elapsed = format_time(time.time() - t0)
            print('  Batch {:>5,}  of  {:>5,}.    Elapsed: {:}.'.format(step, len(test_dataloader), elapsed))

        batch = tuple(t.to(device) for t in batch)
        b_input_ids, b_input_mask, b_labels = batch

        with torch.no_grad():
            outputs = model(b_input_ids, 
                            token_type_ids=None, 
                            attention_mask=b_input_mask)

        logits = outputs[0]
        logits = logits.detach().cpu().numpy()
        label_ids = b_labels.to('cpu').numpy()
        
        for b in logits:
            accum_logits.append(list(b))

        for b in label_ids:
            accum_label_ids.append(list(b))

    accum_logits = np.array(accum_logits)
    accum_label_ids = np.array(accum_label_ids)
    results = multi_label_metrics(accum_logits, accum_label_ids)

    print("")
    print("Accuracy: {0:.4f}".format(results['accuracy']))
    print("F1 (Macro) Score: {0:.4f}".format(results['f1_macro']))
    print("F1 (Micro) Score: {0:.4f}".format(results['f1_micro']))
    print("F1 (Weighted) Score: {0:.4f}".format(results['f1_weighted']))
    print("ROC-AUC: {0:.4f}".format(results['roc_auc']))
    print("Hamming Loss: {0:.4f}".format(results['hamming_loss']))
    print("Test took: {:}".format(format_time(time.time() - t0)))

    accum_results = []
    accum_results.append(list(results.values()))


if __name__ == '__main__':
    # args = {
    #     "seed": 42,

    # }
    # trial = {'success': True, 'data': {'params': {'batch_size': 32, 'optimizer': 'sgd', 'momentum': 0.7414670522347097, 'learning_rate': 0.0001, 'activation': 'softmax', 'weight_decay': 0, 'encoder': 'dpn', 'loss': 'mse', 'scheduler': 'None', 'pretrained': True}, 'budget': 1, 'model': 'unet', 'dataset': 'satellite'}}
    trial = {
        "params":{
            "batch_size": 32,
            "optimizer": "sgd", 
            "momentum": 0.7414670522347097,
            "learning_rate": 0.0001,
            "activation": "gelu_new",
            "weight_decay": 0,
            "scheduler": "None",
            "max_length": 128,
            "hidden_dropout_prob": 0.5,
            "attention_probs_dropout_prob": 0.1,
            "position_embedding_type": "relative_key_query",
            "is_decoder": True,
            "classifier_dropout": 0.1,

        },
        "budget": 5,
    }
    main(trial)