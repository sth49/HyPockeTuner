#!/usr/bin/env python
"""CLIP 20 Epoch Test Script with Per-Epoch Evaluation"""

import os
import json
import time
from multiprocessing import Queue
import sys

# Set environment variable to use CLIP kernel
os.environ['KERNEL_TYPE'] = 'clip'

# Import kernel after setting environment
from kernels import KernelBase

def test_clip_20epochs():
    """Test CLIP kernel with 20 epochs and per-epoch evaluation"""
    
    print("=" * 80)
    print("CLIP 20 Epoch Test with Per-Epoch Evaluation")
    print("=" * 80)
    
    # Create a dummy queue for communication
    queue = Queue()
    
    # Basic hyperparameters for testing
    trial = {
        'id': 'test_clip_20epoch',
        'budget': 20,  # 20 epochs
        'model': 'clip',
        'dataset': 'mscoco',
        'params': {
            # Basic CLIP hyperparameters
            'learning_rate': 5e-4,      # Standard CLIP learning rate
            'batch_size': 32,           # Reasonable batch size for single GPU
            'eps': 1e-8,               # Adam epsilon
            'weight_decay': 0.1,        # Standard weight decay
            'optimizer_type': 'AdamW',  # Best for CLIP
            'warmup_ratio': 0.2,        # 20% warmup
            'scheduler_type': 'cosine', # Cosine annealing
            'dropout_rate': 0.1,        # Standard dropout
            'temperature_init': 0.07    # Standard CLIP temperature
        }
    }
    
    print(f"🔧 Test Configuration:")
    print(f"  📊 Epochs: {trial['budget']}")
    print(f"  🎯 Model: {trial['model']}")
    print(f"  📁 Dataset: {trial['dataset']}")
    print(f"  🔧 Hyperparameters:")
    for key, value in trial['params'].items():
        print(f"    {key}: {value}")
    print("")
    
    try:
        # Create kernel instance
        print("🚀 Creating CLIP kernel instance...")
        kernel = KernelBase(trial, queue)
        print("✅ Kernel instance created successfully")
        
        # Record start time
        start_time = time.time()
        print(f"⏰ Training started at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("")
        
        # Run training with per-epoch evaluation
        print("🎯 Starting 20-epoch training with per-epoch evaluation...")
        print("📈 Progress will be logged every epoch")
        print("-" * 80)
        
        result = kernel.run()
        
        # Record end time
        end_time = time.time()
        training_duration = end_time - start_time
        
        print("-" * 80)
        print("🎉 Training completed successfully!")
        print(f"⏰ Training finished at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⌛ Total training time: {training_duration:.1f} seconds ({training_duration/60:.1f} minutes)")
        print(f"📊 Final Results:")
        print(f"  🔻 Final Loss: {result['loss']:.4f}")
        print(f"  🎯 Final Zero-shot Accuracy: {result['metric']:.2f}%")
        print("")
        
        # Check queue messages for detailed logs
        messages = []
        while not queue.empty():
            messages.append(queue.get())
        
        print(f"📋 Received {len(messages)} progress messages during training")
        
        # Summary statistics
        print("=" * 80)
        print("📈 TRAINING SUMMARY")
        print("=" * 80)
        print(f"✅ Status: SUCCESS")
        print(f"🕐 Duration: {training_duration/60:.1f} minutes")
        print(f"📊 Epochs: {trial['budget']}")
        print(f"🎯 Final Accuracy: {result['metric']:.2f}%")
        print(f"🔻 Final Loss: {result['loss']:.4f}")
        print(f"⚡ Avg seconds/epoch: {training_duration/trial['budget']:.1f}")
        print("")
        
        # Performance analysis
        if result['metric'] > 5.0:
            print("🎉 GOOD: Model is learning well!")
        elif result['metric'] > 1.0:
            print("⚠️  FAIR: Model is learning but slowly")
        else:
            print("🔴 POOR: Model needs more training or different hyperparameters")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during training: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    
    print("🔍 Checking CLIP module availability...")
    
    # Check if CLIP module exists
    if not os.path.exists("clip"):
        print("❌ CLIP module directory not found")
        print("   Please ensure the 'clip' directory exists with the model and dataloader")
        sys.exit(1)
    
    print("✅ CLIP module directory found")
    
    # Check GPU availability
    try:
        import torch
        if torch.cuda.is_available():
            gpu_count = torch.cuda.device_count()
            gpu_name = torch.cuda.get_device_name(0)
            print(f"✅ GPU available: {gpu_name} (Count: {gpu_count})")
        else:
            print("⚠️  No GPU available, will use CPU (much slower)")
    except ImportError:
        print("⚠️  PyTorch not available, cannot check GPU")
    
    print("")
    
    # Run the test
    success = test_clip_20epochs()
    
    if success:
        print("✅ 20-epoch CLIP test completed successfully!")
        print("")
        print("🔄 Next steps:")
        print("  1. Check the per-epoch evaluation logs above")
        print("  2. Analyze accuracy progression over epochs")
        print("  3. Adjust hyperparameters if needed")
        print("  4. Scale up epochs if performance is promising")
    else:
        print("❌ 20-epoch CLIP test failed!")
        print("")
        print("🔧 Troubleshooting:")
        print("  1. Check CLIP module dependencies")
        print("  2. Verify dataset paths are correct")
        print("  3. Ensure sufficient GPU memory")
        print("  4. Check error logs above")

if __name__ == "__main__":
    main()