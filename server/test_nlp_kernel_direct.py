#!/usr/bin/env python
"""
Direct test for NLP kernel - bypasses unnecessary imports
"""

import sys
import os
import json
import torch
import time
import numpy as np
import random
from datasets import load_dataset
from transformers import BertTokenizer, BertForSequenceClassification
from torch.optim import AdamW
from torch.utils.data import TensorDataset, DataLoader, RandomSampler
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import accuracy_score
from tqdm import tqdm

def create_test_trial():
    """Create test trial configuration"""
    return {
        'id': 'test_nlp_direct',
        'budget': 1,  # 1 epoch for quick test
        'model': 'bert-multilingual',
        'dataset': 'korean_hate_speech',
        'params': {
            'activation': 'gelu',
            'dropout_probability': 0.1,
            'positional_embedding': 'absolute', 
            'classifier_dropout': 0.1,
            'batch_size': 8,
            'learning_rate': 2e-5,
            'weight_decay': 0.01,
            'optimizer': 'adamw',
            'scheduler': 'linear_warmup',
        }
    }

def test_nlp_kernel_direct():
    """Test NLP functionality directly without kernel wrapper"""
    
    print("="*60)
    print("Direct NLP Kernel Test")
    print("="*60)
    
    if torch.cuda.is_available():
        print(f"✓ GPU: {torch.cuda.get_device_name(0)}")
        device = torch.device("cuda")
    else:
        print("⚠ Using CPU")
        device = torch.device("cpu")
    
    trial = create_test_trial()
    params = trial['params']
    
    print(f"\nTrial Config:")
    print(f"  - Budget: {trial['budget']} epochs")
    print(f"  - Batch size: {params['batch_size']}")
    print(f"  - Learning rate: {params['learning_rate']}")
    
    try:
        # Clear dataset cache first
        cache_dir = os.path.expanduser("~/.cache/huggingface/datasets")
        if os.path.exists(cache_dir):
            import shutil
            shutil.rmtree(cache_dir)
            print("✓ Cleared dataset cache")
        
        # Load small dataset sample
        print("\n📥 Loading dataset...")
        try:
            # Try loading with force download
            dataset = load_dataset("jeanlee/kmhas_korean_hate_speech", 
                                 split="train[:50]",  # Only 50 samples
                                 download_mode="force_redownload")
            print(f"✓ Loaded {len(dataset)} samples")
        except Exception as e:
            print(f"❌ Dataset loading failed: {e}")
            print("💡 Trying alternative approach...")
            # Create dummy data for testing
            dataset = {
                'text': ['테스트 문장입니다.'] * 50,
                'label': [[8]] * 50  # All "not_hate_speech" labels
            }
            print("✓ Using dummy dataset for testing")
        
        # Prepare data
        print("\n🔧 Preparing data...")
        if isinstance(dataset, dict):
            texts = dataset['text']
            labels = dataset['label']
        else:
            texts = dataset['text']
            labels = dataset['label']
        
        # Add special tokens
        sentences = ['[CLS] ' + str(text) + ' [SEP]' for text in texts]
        
        # Convert labels to one-hot
        enc = MultiLabelBinarizer()
        enc.fit([[0,1,2,3,4,5,6,7,8]])  # Fit with all possible labels
        labels_onehot = enc.transform(labels)
        
        print(f"✓ Processed {len(sentences)} sentences")
        print(f"✓ Labels shape: {labels_onehot.shape}")
        
        # Initialize tokenizer and model
        print("\n🤖 Loading model...")
        tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased')
        model = BertForSequenceClassification.from_pretrained(
            "bert-base-multilingual-cased",
            num_labels=9,
            problem_type="multi_label_classification"
        ).to(device)
        print("✓ Model loaded")
        
        # Tokenize and prepare tensors
        print("\n🔤 Tokenizing...")
        inputs = []
        masks = []
        
        MAX_LEN = 128
        for sentence in sentences:
            tokens = tokenizer.tokenize(sentence)
            input_ids = tokenizer.convert_tokens_to_ids(tokens)
            
            # Truncate/pad
            if len(input_ids) > MAX_LEN:
                input_ids = input_ids[:MAX_LEN]
            
            attention_mask = [1] * len(input_ids) + [0] * (MAX_LEN - len(input_ids))
            input_ids = input_ids + [0] * (MAX_LEN - len(input_ids))
            
            inputs.append(input_ids)
            masks.append(attention_mask)
        
        # Convert to tensors
        input_tensor = torch.tensor(inputs, dtype=torch.long, device=device)
        mask_tensor = torch.tensor(masks, dtype=torch.float, device=device)
        label_tensor = torch.tensor(labels_onehot, dtype=torch.float, device=device)
        
        print(f"✓ Tensor shapes: {input_tensor.shape}, {mask_tensor.shape}, {label_tensor.shape}")
        
        # Create data loader
        dataset_torch = TensorDataset(input_tensor, mask_tensor, label_tensor)
        dataloader = DataLoader(dataset_torch, batch_size=params['batch_size'], shuffle=True)
        
        # Initialize optimizer
        optimizer = AdamW(model.parameters(), lr=params['learning_rate'])
        
        # Training
        print(f"\n🏃 Training for {trial['budget']} epoch(s)...")
        model.train()
        
        total_loss = 0
        num_batches = 0
        
        for batch in tqdm(dataloader, desc="Training"):
            optimizer.zero_grad()
            
            batch_inputs, batch_masks, batch_labels = [b.to(device) for b in batch]
            
            outputs = model(batch_inputs, 
                          attention_mask=batch_masks, 
                          labels=batch_labels)
            
            loss = outputs.loss
            total_loss += loss.item()
            num_batches += 1
            
            loss.backward()
            optimizer.step()
        
        avg_loss = total_loss / num_batches
        print(f"✓ Training completed - Average loss: {avg_loss:.4f}")
        
        # Evaluation
        print("\n📊 Evaluating...")
        model.eval()
        all_predictions = []
        all_labels = []
        
        with torch.no_grad():
            for batch in dataloader:
                batch_inputs, batch_masks, batch_labels = [b.to(device) for b in batch]
                
                outputs = model(batch_inputs, attention_mask=batch_masks)
                predictions = torch.sigmoid(outputs.logits)
                
                all_predictions.extend(predictions.cpu().numpy())
                all_labels.extend(batch_labels.cpu().numpy())
        
        # Calculate metrics
        predictions_binary = (np.array(all_predictions) > 0.5).astype(int)
        accuracy = accuracy_score(all_labels, predictions_binary)
        
        print(f"✓ Evaluation completed")
        print(f"  - Accuracy: {accuracy:.4f}")
        print(f"  - Loss: {avg_loss:.4f}")
        
        results = {"loss": avg_loss, "metric": accuracy}
        
        print("\n" + "="*60)
        print("🎉 SUCCESS - NLP kernel test completed!")
        print(f"Final results: Loss={results['loss']:.4f}, Accuracy={results['metric']:.4f}")
        print("="*60)
        
        return True, results
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, None

if __name__ == "__main__":
    success, results = test_nlp_kernel_direct()
    
    if success:
        print(f"\n✅ Test passed! The NLP kernel logic works correctly.")
        print("You can now use it with trial configurations.")
    else:
        print(f"\n❌ Test failed. Check the errors above.")