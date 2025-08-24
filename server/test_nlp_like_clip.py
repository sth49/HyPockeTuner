#!/usr/bin/env python
"""Test script for NLP kernel integration (similar to test_clip.py)"""

import os
import json
import shutil
from multiprocessing import Queue
import sys

# Import trial class
from trial import Trial

def test_nlp_kernel():
    """Test NLP kernel with sample hyperparameters using proper Trial structure"""
    
    # Create a dummy queue for communication
    queue = Queue()
    
    # Create a proper Trial instance like the system would
    trial = Trial(
        id='test_trial_nlp_001',
        bracket_id=0,
        round_id=0, 
        trial_id=0,
        config={
            'learning_rate': 2e-5,
            'batch_size': 16,
            'weight_decay': 0.01,
            'optimizer': 'adamw',
            'scheduler': 'linear_warmup',
            'activation': 'gelu',
            'dropout_probability': 0.1,
            'positional_embedding': 'absolute',
            'classifier_dropout': 0.1
        },
        budget=1,  # 1 epoch for quick test
        model='bert-multilingual',
        dataset='korean_hate_speech'
    )
    
    print(f"Testing NLP kernel with trial configuration:")
    print(json.dumps(trial.to_dict(), indent=2, default=str))
    
    try:
        # Import NLP kernel directly to avoid segmentation_models_pytorch dependency
        print("✓ Importing NLP kernel...")
        
        import importlib.util
        spec = importlib.util.spec_from_file_location("nlp_kernel", 
                                                      "kernels/nlp_kernel.py")
        nlp_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(nlp_module)
        
        # Create old-style trial dict for compatibility with existing NLP kernel
        trial_dict = {
            'id': trial.id,
            'budget': trial.budget,
            'model': trial.model,
            'dataset': trial.dataset,
            'params': trial.config
        }
        
        # Create kernel instance
        kernel = nlp_module.KernelBase(trial_dict)
        print("✓ Kernel instance created successfully")
        
        # Run training
        print("Starting training...")
        print("This may take a few minutes and will download models/datasets on first run...")
        
        result = kernel.run()
        
        print(f"✓ Training completed")
        print(f"  Loss: {result['loss']:.4f}")
        print(f"  Metric (Accuracy): {result['metric']:.4f}")
        
        # Update trial with results like the real system would
        trial.update_result(result['loss'], result['metric'])
        
        print(f"✓ Trial updated successfully")
        print(f"  Final trial state: {json.dumps(trial.to_dict(), indent=2, default=str)}")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import Error: {e}")
        print("Missing dependencies. Try installing:")
        print("  pip install transformers datasets torch scikit-learn")
        return False
        
    except Exception as e:
        print(f"✗ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False


def create_nlp_config():
    """Create NLP configuration for Korean hate speech dataset"""
    
    nlp_config = {
        "name": "Korean Hate Speech Classification",
        "model": "bert-multilingual", 
        "dataset": "korean_hate_speech",
        "hyperparameters": [
            {
                "name": "learning_rate",
                "displayName": "lr", 
                "type": "uniform",
                "values": [1e-5, 2e-5, 3e-5, 5e-5],
                "range": [1e-5, 5e-5],
                "log": True
            },
            {
                "name": "batch_size",
                "displayName": "bs",
                "type": "ordinal", 
                "values": [8, 16, 32],
                "range": [8, 32]
            },
            {
                "name": "optimizer",
                "displayName": "opt",
                "type": "unordered",
                "values": ["adamw", "adafactor"]
            },
            {
                "name": "scheduler", 
                "displayName": "sch",
                "type": "unordered",
                "values": ["linear_warmup", "cos_warmup", "const", "none"]
            },
            {
                "name": "weight_decay",
                "displayName": "wd", 
                "type": "uniform",
                "values": [0.0, 0.01, 0.1],
                "range": [0.0, 0.1]
            },
            {
                "name": "dropout_probability",
                "displayName": "drop",
                "type": "uniform", 
                "values": [0.0, 0.1, 0.2, 0.3],
                "range": [0.0, 0.3]
            },
            {
                "name": "activation",
                "displayName": "act",
                "type": "unordered",
                "values": ["gelu", "relu", "silu", "tanh"]
            },
            {
                "name": "positional_embedding", 
                "displayName": "pos",
                "type": "unordered",
                "values": ["absolute", "relative_key", "relative_key_query"]
            },
            {
                "name": "classifier_dropout",
                "displayName": "cls_drop",
                "type": "uniform",
                "values": [0.0, 0.1, 0.2],
                "range": [0.0, 0.2] 
            }
        ],
        "bohb": {
            "max_budget": 10,  # Max 10 epochs
            "eta": 3,
            "min_budget": 1   # Min 1 epoch
        },
        "metric": {
            "name": "Accuracy",
            "range": [0, 1]
        }
    }
    
    # Save NLP config
    config_path = "config/nlp_config.json"
    with open(config_path, 'w') as f:
        json.dump(nlp_config, f, indent=2)
    
    print(f"✓ NLP configuration saved to {config_path}")
    
    # Ask if user wants to set as default
    user_response = input("Use NLP config as default kernel_info.json? (y/n): ")
    if user_response.lower() == 'y':
        shutil.copy(config_path, "config/kernel_info.json")
        print("✓ NLP config set as default kernel_info.json")
    
    return True


def check_dependencies():
    """Check if NLP kernel dependencies are available"""
    
    print("Checking NLP kernel dependencies...")
    
    dependencies = [
        ('torch', 'PyTorch'),
        ('transformers', 'Hugging Face Transformers'), 
        ('datasets', 'Hugging Face Datasets'),
        ('sklearn', 'Scikit-learn'),
        ('numpy', 'NumPy'),
        ('pandas', 'Pandas'),
        ('tqdm', 'TQDM')
    ]
    
    missing = []
    for module, name in dependencies:
        try:
            __import__(module)
            print(f"✓ {name}")
        except ImportError:
            print(f"✗ {name} - NOT INSTALLED")
            missing.append(module)
    
    if missing:
        print(f"\n⚠ Missing dependencies: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        return False
    else:
        print("✓ All dependencies available")
        return True


def test_data_loading():
    """Test data loading functionality"""
    
    print("Testing data loading...")
    
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("nlp_kernel", 
                                                      "kernels/nlp_kernel.py")
        nlp_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(nlp_module)
        
        print("Loading Korean hate speech dataset (this may take a while on first run)...")
        train_loader, val_loader, test_loader = nlp_module.fetch_korean_hate_speech(batch_size=32)
        
        print(f"✓ Train batches: {len(train_loader)} (samples: ~{len(train_loader)*32})")
        print(f"✓ Validation batches: {len(val_loader)} (samples: ~{len(val_loader)*32})")
        print(f"✓ Test batches: {len(test_loader)} (samples: ~{len(test_loader)*32})")
        
        # Test a sample batch
        for batch in train_loader:
            input_ids, masks, labels = batch
            print(f"✓ Sample batch shapes - Input: {input_ids.shape}, Masks: {masks.shape}, Labels: {labels.shape}")
            break
            
        return True
        
    except Exception as e:
        print(f"✗ Data loading failed: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("NLP Kernel Integration Test (Korean Hate Speech)")
    print("=" * 60)
    
    # Check dependencies first
    if not check_dependencies():
        print("\nPlease install missing dependencies and try again.")
        sys.exit(1)
    
    # Check if kernels directory exists
    if not os.path.exists("kernels"):
        print("✗ Kernels directory not found")
        print("  Please ensure you're running from the server directory")
        sys.exit(1)
        
    if not os.path.exists("kernels/nlp_kernel.py"):
        print("✗ NLP kernel not found at kernels/nlp_kernel.py")
        sys.exit(1)
        
    print("✓ NLP kernel found")
    
    # Create configuration
    if not os.path.exists("config"):
        os.makedirs("config")
        
    create_nlp_config()
    
    # Ask user what to test
    print("\nTest options:")
    print("1. Data loading only (quick)")
    print("2. Full training test (slower)")
    print("3. Both")
    
    choice = input("Enter choice (1/2/3): ").strip()
    
    success = True
    
    if choice in ['1', '3']:
        print("\n" + "-" * 60)
        print("Testing data loading...")
        print("-" * 60)
        if not test_data_loading():
            success = False
    
    if choice in ['2', '3']:
        print("\n" + "-" * 60) 
        print("Testing full kernel...")
        print("-" * 60)
        if not test_nlp_kernel():
            success = False
    
    # Results
    if success:
        print("\n" + "=" * 60)
        print("✓ NLP kernel integration test PASSED")
        print("=" * 60)
        print("\nNext steps to use in HyPockeTuner:")
        print("1. Use config/nlp_config.json as kernel configuration")
        print("2. Set model='bert-multilingual' and dataset='korean_hate_speech' in experiments")
        print("3. The kernel will automatically use Korean hate speech dataset")
        print("4. Optimization metric will be classification accuracy")
    else:
        print("\n" + "=" * 60)
        print("✗ NLP kernel integration test FAILED")
        print("=" * 60)
        print("\nPlease check:")
        print("1. All dependencies are installed")
        print("2. Internet connection (for downloading datasets/models)")
        print("3. Sufficient disk space (~1GB for models and datasets)")
        print("4. GPU/CUDA available if using GPU")