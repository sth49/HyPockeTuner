import torch
import numpy as np
import torch
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import requests
import os
import hashlib
import tempfile
import gzip
import dataclasses
import json
import logging
import os
import sys
from pathlib import Path

import pandas as pd
import torch
from torch.utils.data import DataLoader

# import training
# import wandb
from kernels.common import getters
from kernels.common.argparse import TrainingArguments
from kernels.common.utils import (increment_path, random_split, rle_encode,
                          seed_everything)
from kernels.dataset import transform
from kernels.dataset.dataset import SatelliteDataset
from kernels.model.unet import UNet
from kernels.training.trainer import Trainer
from datasets import load_dataset
import argparse
import json
import logging
import math
import os
import random
from pathlib import Path

import torch
from datasets import load_dataset
from torch.utils.data import DataLoader
from tqdm.auto import tqdm

import transformers
import torch

from transformers import BertTokenizer
from transformers import BertForSequenceClassification, BertConfig, Adafactor
from torch.optim import AdamW  # Use PyTorch's AdamW instead of transformers'
from transformers import get_linear_schedule_with_warmup, get_constant_schedule, get_constant_schedule_with_warmup, get_cosine_schedule_with_warmup, get_cosine_with_hard_restarts_schedule_with_warmup, get_polynomial_decay_schedule_with_warmup
from torch.utils.data import TensorDataset, DataLoader, RandomSampler, SequentialSampler
# from keras_preprocessing.sequence import pad_sequences  # Replaced with PyTorch native

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



SEED = 123
use_cuda = torch.cuda.is_available()
# device = torch.device("cuda" if use_cuda else "cpu")

class Dispatcher():
    def __init__(self, queue):
        self.queue = queue
    
    def emit(self, event, data):
        if self.queue:
            self.queue.put((event, data))

class KernelBase:
    def __init__(self, trial, queue=None):
        print("nlp kernel init")
        self.trial = trial
        self.budget = int(trial['budget'])
        self.params = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']
        self.queue = queue  # For worker communication
        self.dispatcher = Dispatcher(self.queue)

    def run(self):
        np.random.seed(SEED)
        if self.dataset=="CIFAR10":
            x_train, y_train, x_test, y_test = fetch_mnist()
            res = train_mnist(**self.params, x_train=x_train, y_train=y_train,
                           x_test=x_test, y_test=y_test, n_epochs=self.budget)
        if self.dataset=="mnist":
            x_train, y_train, x_test, y_test = fetch_mnist()
            res = train_mnist(**self.params, x_train=x_train, y_train=y_train,
                           x_test=x_test, y_test=y_test, n_epochs=self.budget)
        # if self.dataset=="satellite":
        #     res = train_satellite(self.trial)
        if self.dataset=="K-MHaS":
            res = train_korean_hate_speech(self.trial, self.dispatcher)

        # Report completion to worker if queue exists
        if self.queue:
            self.queue.put(('done', res))
        
        return res
    
class MNIST(torch.nn.Module):
    def __init__(self, hidden_size, activation):
        super().__init__()
        self.l1 = torch.nn.Linear(784, hidden_size)
        self.l2 = torch.nn.Linear(hidden_size, hidden_size)
        if activation == 'relu':
            self.a = torch.nn.functional.relu
        elif activation == 'tanh':
            self.a = torch.tanh
        elif activation == 'lrelu':
            self.a = torch.nn.functional.leaky_relu
        else:
            raise NotImplementedError
        self.output = torch.nn.Linear(hidden_size, 10)

    def forward(self, x):
        return self.output(self.a(self.l2(self.a(self.l1(x)))))
    
    

def fetch(url):
    fp = os.path.join(tempfile.gettempdir(),
                      hashlib.md5(url.encode('utf-8')).hexdigest())
    if os.path.isfile(fp) and os.stat(fp).st_size > 0:
        with open(fp, "rb") as f:
            dat = f.read()
    else:
        print("fetching %s" % url)
        dat = requests.get(url).content
        with open(fp+".tmp", "wb") as f:
            f.write(dat)
        os.rename(fp+".tmp", fp)
    return dat


def fetch_from_local(path):
    
    if os.path.isfile(path) and os.stat(path).st_size > 0:
        with open(path, "rb") as f:
            data = f.read()
            return data
    else:
        
        raise FileNotFoundError(f"File not found or is empty at {path}")



def parse_mnist(data):
    return np.frombuffer(gzip.decompress(data), dtype=np.uint8).copy()

def fetch_mnist():
    # X = parse_mnist(
    #     fetch("http://yann.lecun.com/exdb/mnist/train-images-idx3-ubyte.gz")
    # )[0x10:].reshape((-1, 28, 28))
    # Y = parse_mnist(fetch(
    #     "http://yann.lecun.com/exdb/mnist/train-labels-idx1-ubyte.gz"))[8:]
    X = parse_mnist(
        fetch_from_local("./data/MNIST/raw/train-images-idx3-ubyte.gz")
    )[0x10:].reshape((-1, 28, 28))
    Y = parse_mnist(fetch_from_local(
        "./data/MNIST/raw/train-labels-idx1-ubyte.gz"))[8:]
    idx = np.arange(0, 2048+128)
    np.random.shuffle(idx)
    X_train = X[idx[:2048]].reshape(-1, 28*28)
    Y_train = Y[idx[:2048]]
    X_test = X[idx[2048:]].reshape(-1, 28*28)
    Y_test = Y[idx[2048:]]
    return X_train, Y_train, X_test, Y_test
    
def train_mnist(batch_size, n_epochs, optimizer, hidden_size, scheduler_p,
                activation, learning_rate, weight_decay, momentum,
                x_train, y_train, x_test, y_test):
    
    torch.manual_seed(SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device", device  )
    x_train = torch.from_numpy(x_train.copy()).to(device).float()
    y_train = torch.from_numpy(y_train.copy()).to(device).long()
    x_test = torch.from_numpy(x_test.copy()).to(device).float()
    y_test = torch.from_numpy(y_test.copy()).to(device).long()
    model = MNIST(hidden_size, activation).to(device)

    if optimizer == 'adam':
        optimizer = torch.optim.Adam(model.parameters(),
                                     weight_decay=weight_decay, lr=learning_rate)
    elif optimizer == 'sgd':
        optimizer = torch.optim.SGD(model.parameters(),
                                    weight_decay=weight_decay, lr=learning_rate,
                                    momentum=momentum)
    elif optimizer == 'rms':
        optimizer = torch.optim.RMSprop(model.parameters(),
                                        weight_decay=weight_decay, lr=learning_rate,
                                        momentum=momentum)
    else:
        raise NotImplementedError

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=n_epochs)

    loss_fn = torch.nn.CrossEntropyLoss()

    for epoch in range(int(n_epochs)):
        for batch_idx in range(len(x_train) // batch_size):
            batch = x_train[
                batch_idx * batch_size:(batch_idx + 1) * batch_size]
            output = model(batch)
            loss = loss_fn(output, y_train[
                batch_idx * batch_size:(batch_idx + 1) * batch_size])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        
        if scheduler_p:
            scheduler.step()
    output = model(x_test)
    loss = loss_fn(output, y_test)
    acc = (output.argmax(axis=1) == y_test).float().sum()/y_test.shape[0]
    return {"loss": loss.item(), "metric": acc.item()}

def fetch_korean_hate_speech(max_length=256, batch_size=32):
    MAX_LEN = max_length

    # train = load_dataset("jeanlee/kmhas_korean_hate_speech", split="train")
    # validation = load_dataset("jeanlee/kmhas_korean_hate_speech", split="validation")
    # test = load_dataset("jeanlee/kmhas_korean_hate_speech", split="test")
    # Load from local data directory
    train = load_dataset("csv", data_files="./data/korean-hate-speech-detection/kmhas_train.txt", delimiter="\t")['train']
    validation = load_dataset("csv", data_files="./data/korean-hate-speech-detection/kmhas_valid.txt", delimiter="\t")['train']
    test = load_dataset("csv", data_files="./data/korean-hate-speech-detection/kmhas_test.txt", delimiter="\t")['train']

    # Column name is 'document' not 'text' in local files
    train_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', train['document']))
    validation_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', validation['document']))
    test_sentences = list(map(lambda x: '[CLS] ' + str(x) + ' [SEP]', test['document']))
    enc = MultiLabelBinarizer()

    def multi_label(example):
        # Parse labels from string format like "2,4" to list of lists
        labels_parsed = []
        for label_str in example['label']:
            if str(label_str) == '8':  # not_hate_speech
                labels_parsed.append([8])
            else:
                # Parse comma-separated labels
                label_nums = [int(x.strip()) for x in str(label_str).split(',')]
                labels_parsed.append(label_nums)
        
        # Fit encoder with all possible labels
        enc.fit([[i] for i in range(9)])  # Labels 0-8
        enc_label = enc.transform(labels_parsed)
        float_arr = enc_label.astype(float)
        update_label = float_arr.tolist()
        return update_label

    train_labels = multi_label(train)
    validation_labels = multi_label(validation)
    test_labels = multi_label(test)
    tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased', do_lower_case=False)

    def data_to_tensor (sentences, labels):
        tokenized_texts = [tokenizer.tokenize(sent) for sent in sentences]
        input_ids = [tokenizer.convert_tokens_to_ids(x) for x in tokenized_texts]
        
        # PyTorch native padding instead of keras pad_sequences
        padded_input_ids = []
        attention_masks = []
        
        for seq in input_ids:
            # Truncate if too long
            if len(seq) > MAX_LEN:
                seq = seq[:MAX_LEN]
            
            # Create attention mask (1 for real tokens, 0 for padding)
            attention_mask = [1] * len(seq) + [0] * (MAX_LEN - len(seq))
            
            # Pad with zeros
            padded_seq = seq + [0] * (MAX_LEN - len(seq))
            
            padded_input_ids.append(padded_seq)
            attention_masks.append(attention_mask)

        tensor_inputs = torch.tensor(padded_input_ids, dtype=torch.long)
        tensor_labels = torch.tensor(labels, dtype=torch.float)
        tensor_masks = torch.tensor(attention_masks, dtype=torch.float)

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

def train_korean_hate_speech(trial, dispatcher=None):
    print("train_korean_hate_speech start")
    print("trial", trial)
    
    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        params = trial['params']
        
        # Signal training start and report initial progress
        if dispatcher:
            dispatcher.emit('start', None)
            dispatcher.emit('progress', {'current': 0, 'total': trial['budget']})

        train_dataloader, validation_dataloader, test_dataloader = fetch_korean_hate_speech(batch_size=params['batch_size'])

        num_labels = 9
        model = BertForSequenceClassification.from_pretrained("bert-base-multilingual-cased", 
                                                              num_labels=num_labels, 
                                                              problem_type="multi_label_classification", 
                                                              hidden_act=params['activation'],
                                                              hidden_dropout_prob = params['dropout_probability'],
                                                              attention_probs_dropout_prob = params['dropout_probability'],
                                                              position_embedding_type=params['positional_embedding'],
                                                              classifier_dropout=params['classifier_dropout'],
                                                              )
        # print(model.config)
        model.cuda()
        model_params = model.parameters()
        # print("optimizer", params["optimizer"])

        # print("scheduler", params["scheduler"])
       
        
        
        if params["optimizer"]=="adamw":
            optimizer = AdamW(model.parameters(),
                          lr = params['learning_rate'],
                          eps = 1e-8
                        )
        elif params["optimizer"]=="adafactor":
            optimizer = Adafactor(
                model.parameters(),
                lr = params['learning_rate'],
                eps=(1e-30, 1e-3),
                clip_threshold=1.0,
                decay_rate=-0.8,
                beta1=None,
                weight_decay= params['weight_decay'],
                scale_parameter=False,
                warmup_init=False,
                relative_step=False)
        else:
            optimizer = getters.get_optimizer(params["optimizer"], model_params, params)

        # change epochs for improving results (our paper : epochs = 4)
        epochs = trial['budget']
        total_steps = len(train_dataloader) * epochs

        if params['scheduler'] == "const":
            scheduler = get_constant_schedule(optimizer)
        elif params["scheduler"] == "const_warmup":
            scheduler = get_constant_schedule_with_warmup(optimizer, 
                                                        num_warmup_steps = 0,
                                                        )
        elif params['scheduler'] == "cos_warmup":
            scheduler = get_cosine_schedule_with_warmup(
                optimizer, num_warmup_steps = 0, num_training_steps = total_steps
            )
        elif params['scheduler'] == "cos_hard":
            scheduler = get_cosine_with_hard_restarts_schedule_with_warmup(
                optimizer, num_warmup_steps = 0, num_training_steps = total_steps
            )
        elif params['scheduler'] == "linear_warmup":
            scheduler = get_linear_schedule_with_warmup(optimizer, 
                                                        num_warmup_steps = 0,
                                                        num_training_steps = total_steps)
        elif params['scheduler'] == "poly_decay":
            scheduler = get_polynomial_decay_schedule_with_warmup(optimizer,
                                                                num_warmup_steps = 0,
                                                                num_training_steps = total_steps,
                                                                lr_end = 0.0)
        elif params['scheduler'] == "none":
            scheduler = None
        else:
            raise NotImplementedError


        def format_time(elapsed):
            elapsed_rounded = int(round((elapsed)))
            return str(datetime.timedelta(seconds=elapsed_rounded))  # hh:mm:ss

        def multi_label_metrics(predictions, labels, threshold=0.5):
            sigmoid = torch.nn.Sigmoid()
            probs = sigmoid(torch.Tensor(predictions))
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
            
            print('======== Epoch {:} / {:} ========'.format(epoch_i + 1, epochs))
            print('Training...')

            t0 = time.time()
            total_loss = 0

            model.train()

            # Add tqdm progress bar for training batches
            train_progress = tqdm(train_dataloader, desc=f"Epoch {epoch_i+1}/{epochs} Training", unit="batch")
            for step, batch in enumerate(train_progress):
                # if step % 250 == 0 and not step == 0:
                #     elapsed = format_time(time.time() - t0)
                #     print('  Batch {:>5,}  of  {:>5,}.    Elapsed: {:}.'.format(step, len(train_dataloader), elapsed))
                #     break
                

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
                if scheduler:
                    scheduler.step()

                model.zero_grad()
                
                # Update progress bar with current loss
                train_progress.set_postfix({'loss': f'{loss.item():.4f}', 'avg_loss': f'{total_loss/(step+1):.4f}'})
                # if (step == 200):
                #     break  # For quicker epochs during testing

            avg_train_loss = total_loss / len(train_dataloader)            

            print("  Average training loss: {0:.4f}".format(avg_train_loss))
            print("  Training epcoh took: {:}".format(format_time(time.time() - t0)))
            
            # Report progress to worker if dispatcher exists
            if dispatcher:
                dispatcher.emit('progress', {'current': epoch_i + 1, 'total': epochs})
            
            print("")
            print("Training complete!")

        # Signal evaluation start
        if dispatcher:
            dispatcher.emit('progress', {'current': epochs, 'total': epochs, 'phase': 'evaluation'})

        t0 = time.time()
        model.eval()
        accum_logits, accum_label_ids = [], []
        total_test_loss = 0
    
        # Add tqdm progress bar for evaluation
        eval_progress = tqdm(test_dataloader, desc="Evaluating", unit="batch")
        for step, batch in enumerate(eval_progress):
            # if step % 100 == 0 and not step == 0:
            #     elapsed = format_time(time.time() - t0)
            #     print('  Batch {:>5,}  of  {:>5,}.    Elapsed: {:}.'.format(step, len(test_dataloader), elapsed))
            #     break

            batch = tuple(t.to(device) for t in batch)
            b_input_ids, b_input_mask, b_labels = batch

            with torch.no_grad():
                outputs = model(b_input_ids, 
                                token_type_ids=None, 
                                attention_mask=b_input_mask)
                outputs2 = model(b_input_ids, 
                                token_type_ids=None, 
                                attention_mask=b_input_mask, 
                                labels=b_labels)
            loss = outputs2[0]
            total_test_loss += loss.item()

            logits = outputs[0]
            logits = logits.detach().cpu().numpy()
            label_ids = b_labels.to('cpu').numpy()
            
            for b in logits:
                accum_logits.append(list(b))

            for b in label_ids:
                accum_label_ids.append(list(b))
                
            # Update evaluation progress bar
            eval_progress.set_postfix({'test_loss': f'{total_test_loss/(step+1):.4f}'})
            # if (step == 200):
            #     break
        avg_val_loss = total_test_loss / len(test_dataloader)
        accum_logits = np.array(accum_logits)
        accum_label_ids = np.array(accum_label_ids)
        results = multi_label_metrics(accum_logits, accum_label_ids)
        print("Accuracy: {0:.4f}".format(results['accuracy']))
        print("Total Validation Loss: {0:.4f}".format(avg_val_loss))
        print("Test took: {:}".format(format_time(time.time() - t0)))
    
        # Signal training completion with results
        result = {"loss": avg_val_loss, "metric": results['accuracy']}
        if dispatcher:
            dispatcher.emit('done', result)

        return result
    
    except Exception as e:
        print(f"Error during training: {str(e)}")
        # Emit error for notification system
        if dispatcher:
            dispatcher.emit('error', str(e))
        # Return dummy results to keep BOHB algorithm working
        return {'loss': 999.0, 'metric': 0.0}



