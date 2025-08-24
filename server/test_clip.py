#!/usr/bin/env python
"""Test script for CLIP kernel integration"""

import os
import json
import shutil
from multiprocessing import Queue
import sys

# Set environment variable to use CLIP kernel
os.environ['KERNEL_TYPE'] = 'clip'

# Import kernel after setting environment
from kernels import KernelBase

def test_clip_kernel():
    """Test CLIP kernel with sample hyperparameters"""
    
    # Create a dummy queue for communication
    queue = Queue()
    
    # Sample trial configuration
    trial = {
        'id': 'test_trial_001',
        'budget': 2,  # 2 epochs for quick test
        'model': 'clip',
        'dataset': 'mscoco',
        'params': {
            'learning_rate': 1e-4,
            'batch_size': 32,
            'eps': 1e-8,
            'weight_decay': 0.1,
            'optimizer_type': 'AdamW'
        }
    }
    
    print(f"Testing CLIP kernel with trial: {json.dumps(trial, indent=2)}")
    
    try:
        # Create kernel instance
        kernel = KernelBase(trial, queue)
        print("✓ Kernel instance created successfully")
        
        # Run training
        print("Starting training...")
        result = kernel.run()
        
        print(f"✓ Training completed")
        print(f"  Loss: {result['loss']:.4f}")
        print(f"  Metric: {result['metric']:.4f}")
        
        # Check queue messages
        messages = []
        while not queue.empty():
            messages.append(queue.get())
        
        print(f"✓ Received {len(messages)} progress messages")
        
        return True
        
    except Exception as e:
        print(f"✗ Error during test: {e}")
        import traceback
        traceback.print_exc()
        return False

def setup_clip_config():
    """Setup CLIP configuration for testing"""
    
    # Copy CLIP config to default location
    if os.path.exists("config/clip_config.json"):
        print("✓ CLIP config found")
        
        # Optionally copy as kernel_info.json for testing
        user_response = input("Use CLIP config as default kernel_info.json? (y/n): ")
        if user_response.lower() == 'y':
            shutil.copy("config/clip_config.json", "config/kernel_info.json")
            print("✓ CLIP config set as default")
    else:
        print("✗ CLIP config not found at config/clip_config.json")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("CLIP Kernel Integration Test")
    print("=" * 50)
    
    # Check if CLIP module exists
    if not os.path.exists("clip"):
        print("✗ CLIP module directory not found")
        print("  Please ensure the 'clip' directory exists with the model and dataloader")
        sys.exit(1)
    
    print("✓ CLIP module directory found")
    
    # Setup configuration
    if not setup_clip_config():
        print("Configuration setup failed")
        sys.exit(1)
    
    # Run test
    print("\nRunning kernel test...")
    print("-" * 50)
    
    if test_clip_kernel():
        print("\n" + "=" * 50)
        print("✓ CLIP kernel integration test PASSED")
        print("=" * 50)
        print("\nNext steps:")
        print("1. Set KERNEL_TYPE=clip environment variable before starting main.py")
        print("2. Use config/clip_config.json as kernel configuration")
        print("3. Start server: KERNEL_TYPE=clip python main.py")
    else:
        print("\n" + "=" * 50)
        print("✗ CLIP kernel integration test FAILED")
        print("=" * 50)
        print("\nPlease check:")
        print("1. CLIP module dependencies are installed")
        print("2. Dataset paths are configured correctly")
        print("3. GPU/CUDA is available if required")