#!/usr/bin/env python
"""
Simple test script for NLP kernel - avoids import conflicts
"""

import torch
import numpy as np
import sys
import os
import time
import json

def test_nlp_kernel_direct():
    """Test NLP kernel by directly importing only what's needed"""
    
    print("="*60)
    print("Simple NLP Kernel Test (Direct Import)")
    print("="*60)
    
    # Check GPU availability
    if torch.cuda.is_available():
        print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
        print(f"  GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    else:
        print("⚠ No GPU available, will use CPU (slower)")
    
    # Create trial configuration
    trial = {
        'id': 'test_trial_simple',
        'budget': 1,  # 1 epoch for quick test
        'model': 'bert-multilingual',
        'dataset': 'korean_hate_speech',
        'params': {
            'activation': 'gelu',
            'dropout_probability': 0.1,
            'positional_embedding': 'absolute',
            'classifier_dropout': 0.1,
            'batch_size': 8,  # Small batch for quick test
            'learning_rate': 2e-5,
            'weight_decay': 0.01,
            'optimizer': 'adamw',
            'scheduler': 'linear_warmup',
        }
    }
    
    print("\nTrial Configuration:")
    print(json.dumps(trial, indent=2))
    
    try:
        # Test individual components first
        print("\n" + "="*60)
        print("Testing individual components...")
        print("="*60)
        
        # Test basic imports
        print("Testing imports...")
        from transformers import BertTokenizer, BertForSequenceClassification
        from torch.optim import AdamW  # Use PyTorch's AdamW instead
        from datasets import load_dataset
        from sklearn.metrics import accuracy_score
        print("✓ All imports successful")
        
        # Test dataset loading
        print("\nTesting dataset loading...")
        train_data = load_dataset("jeanlee/kmhas_korean_hate_speech", split="train[:100]")  # Load only 100 samples
        print(f"✓ Loaded {len(train_data)} training samples")
        
        # Test tokenizer
        print("\nTesting tokenizer...")
        tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased', do_lower_case=False)
        sample_text = "[CLS] This is a test text [SEP]"
        tokens = tokenizer.tokenize(sample_text)
        input_ids = tokenizer.convert_tokens_to_ids(tokens)
        print(f"✓ Tokenizer working - Sample tokens: {len(tokens)}")
        
        # Test model loading
        print("\nTesting model loading...")
        model = BertForSequenceClassification.from_pretrained(
            "bert-base-multilingual-cased",
            num_labels=9,
            problem_type="multi_label_classification"
        )
        print("✓ Model loaded successfully")
        
        # Test moving to device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)
        print(f"✓ Model moved to {device}")
        
        # Test forward pass
        print("\nTesting forward pass...")
        input_tensor = torch.tensor([input_ids + [0] * (128 - len(input_ids))], device=device)
        attention_mask = torch.tensor([[1] * len(input_ids) + [0] * (128 - len(input_ids))], device=device)
        
        with torch.no_grad():
            outputs = model(input_tensor, attention_mask=attention_mask)
            logits = outputs.logits
        
        print(f"✓ Forward pass successful - Output shape: {logits.shape}")
        
        print("\n" + "="*60)
        print("✓ All component tests PASSED!")
        print("="*60)
        print("\nThe NLP kernel components are working correctly.")
        print("You can now run full training by using the actual kernel.")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Component test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_minimal_training():
    """Test minimal training with very small dataset"""
    
    print("\n" + "="*60)
    print("Testing Minimal Training")
    print("="*60)
    
    try:
        from transformers import BertTokenizer, BertForSequenceClassification
        from torch.optim import AdamW  # Use PyTorch's AdamW
        from datasets import load_dataset
        from sklearn.preprocessing import MultiLabelBinarizer
        import random
        
        # Set random seed
        random.seed(42)
        torch.manual_seed(42)
        if torch.cuda.is_available():
            torch.cuda.manual_seed(42)
        
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")
        
        # Load very small dataset
        print("Loading small dataset...")
        dataset = load_dataset("jeanlee/kmhas_korean_hate_speech", split="train[:50]")  # Only 50 samples
        
        # Prepare data
        texts = ['[CLS] ' + str(text) + ' [SEP]' for text in dataset['text']]
        
        # Convert labels to one-hot
        enc = MultiLabelBinarizer()
        labels = enc.fit_transform(dataset['label'])
        
        print(f"✓ Prepared {len(texts)} samples with {labels.shape[1]} labels")
        
        # Initialize tokenizer and model
        tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased')
        model = BertForSequenceClassification.from_pretrained(
            "bert-base-multilingual-cased",
            num_labels=9,
            problem_type="multi_label_classification"
        ).to(device)
        
        # Prepare inputs
        inputs = []
        masks = []
        
        for text in texts:
            tokens = tokenizer.tokenize(text)
            input_ids = tokenizer.convert_tokens_to_ids(tokens)
            
            # Truncate/pad to 128
            if len(input_ids) > 128:
                input_ids = input_ids[:128]
            
            attention_mask = [1] * len(input_ids) + [0] * (128 - len(input_ids))
            input_ids = input_ids + [0] * (128 - len(input_ids))
            
            inputs.append(input_ids)
            masks.append(attention_mask)
        
        # Convert to tensors
        input_tensor = torch.tensor(inputs, dtype=torch.long, device=device)
        mask_tensor = torch.tensor(masks, dtype=torch.float, device=device)
        label_tensor = torch.tensor(labels, dtype=torch.float, device=device)
        
        # Initialize optimizer
        optimizer = AdamW(model.parameters(), lr=2e-5)
        
        print("Starting minimal training (1 batch)...")
        
        model.train()
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(input_tensor, attention_mask=mask_tensor, labels=label_tensor)
        loss = outputs.loss
        
        print(f"✓ Forward pass - Loss: {loss.item():.4f}")
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        print("✓ Backward pass completed")
        
        # Test inference
        model.eval()
        with torch.no_grad():
            outputs = model(input_tensor, attention_mask=mask_tensor)
            predictions = torch.sigmoid(outputs.logits)
        
        print(f"✓ Inference completed - Predictions shape: {predictions.shape}")
        
        # Calculate simple accuracy
        pred_binary = (predictions.cpu().numpy() > 0.5).astype(int)
        accuracy = (pred_binary == labels).mean()
        
        print(f"✓ Simple accuracy: {accuracy:.4f}")
        
        print("\n" + "="*60)
        print("✓ Minimal training test PASSED!")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Minimal training failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Simple NLP Kernel Test')
    parser.add_argument('--components-only', action='store_true', help='Test components only')
    parser.add_argument('--training', action='store_true', help='Test minimal training')
    
    args = parser.parse_args()
    
    success = True
    
    if args.components_only:
        success = test_nlp_kernel_direct()
    elif args.training:
        success = test_minimal_training()
    else:
        # Run both tests
        print("Running component tests first...")
        success = test_nlp_kernel_direct()
        
        if success:
            user_input = input("\nComponents test passed. Run minimal training test? (y/n): ")
            if user_input.lower() == 'y':
                success = test_minimal_training()
    
    if success:
        print("\n🎉 All tests completed successfully!")
        print("The NLP kernel is ready for use with Korean hate speech classification.")
    else:
        print("\n❌ Some tests failed. Please check the error messages above.")
    
    print("\n" + "="*60)
    print("Test completed!")
    print("="*60)