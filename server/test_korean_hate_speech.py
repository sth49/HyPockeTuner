#!/usr/bin/env python3
"""
Test script for Korean Hate Speech NLP kernel
This script tests the NLP kernel with the korean_hate_speech dataset
"""

import sys
import os
import json
import traceback
from multiprocessing import Queue

# Add the server directory to path
sys.path.insert(0, '/home/donghee/HyPockeTuner_new/server')

# Import the kernel
from kernels.segmentation_kernel2 import KernelBase

def test_korean_hate_speech():
    """Test the NLP kernel with korean_hate_speech dataset"""
    
    print("=" * 80)
    print("Testing Korean Hate Speech NLP Kernel")
    print("=" * 80)
    
    # Define test trial configuration
    trial = {
        "params": {
            "learning_rate": 2e-5,
            "optimizer": "adam",
            "scheduler": "linear_warmup",
            "batch_size": 16,  # Reduced batch size for testing
            "weight_decay": 0.01,
            "momentum": 0.9,
            "activation": "gelu",
            "dropout_probability": 0.1,
            "positional_embedding": "absolute",
            "classifier_dropout": 0.1
        },
        "budget": 1,  # Just 1 epoch for quick testing
        "model": "bert",
        "dataset": "korean_hate_speech",
        "sample": "none"
    }
    
    print("\nTest Configuration:")
    print(json.dumps(trial, indent=2))
    
    try:
        # Create queue for progress reporting (not used in test, but required by kernel)
        queue = Queue()
        
        print("\n" + "=" * 40)
        print("Initializing kernel...")
        print("=" * 40)
        
        # Initialize the kernel
        kernel = KernelBase(trial, queue)
        
        print("\n" + "=" * 40)
        print("Starting training...")
        print("=" * 40)
        
        # Run the training
        result = kernel.run()
        
        print("\n" + "=" * 40)
        print("Training completed successfully!")
        print("=" * 40)
        
        print("\nResults:")
        print(f"  Loss: {result['loss']:.4f}")
        print(f"  Accuracy: {result['metric']:.4f}")
        
        # Validate results
        if result['loss'] > 0 and 0 <= result['metric'] <= 1:
            print("\n✅ Test PASSED: NLP kernel works correctly with korean_hate_speech dataset")
            return True
        else:
            print("\n❌ Test FAILED: Invalid results returned")
            return False
            
    except Exception as e:
        print("\n" + "=" * 40)
        print("❌ Test FAILED with error:")
        print("=" * 40)
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("\nTraceback:")
        traceback.print_exc()
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\nChecking dependencies...")
    
    required_packages = [
        'torch',
        'transformers',
        'datasets',
        'sklearn',
        'pandas',
        'numpy',
        'keras_preprocessing'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("Install them with: pip install " + " ".join(missing))
        return False
    
    print("  All dependencies are installed!")
    return True

def check_gpu():
    """Check GPU availability"""
    try:
        import torch
        if torch.cuda.is_available():
            print(f"\n🖥️  GPU Available: {torch.cuda.get_device_name(0)}")
            print(f"  CUDA Version: {torch.version.cuda}")
            return True
        else:
            print("\n⚠️  No GPU available, will use CPU (training will be slower)")
            return False
    except Exception as e:
        print(f"\n⚠️  Could not check GPU: {e}")
        return False

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("Korean Hate Speech NLP Kernel Test Suite")
    print("=" * 80)
    
    # Check dependencies first
    if not check_dependencies():
        print("\n⚠️  Please install missing dependencies before running the test")
        sys.exit(1)
    
    # Check GPU availability
    check_gpu()
    
    # Run the test
    print("\n" + "=" * 80)
    success = test_korean_hate_speech()
    
    # Final summary
    print("\n" + "=" * 80)
    if success:
        print("🎉 All tests passed successfully!")
        print("The NLP kernel is working correctly with the korean_hate_speech dataset.")
    else:
        print("❌ Tests failed. Please check the error messages above.")
    print("=" * 80)
    
    sys.exit(0 if success else 1)