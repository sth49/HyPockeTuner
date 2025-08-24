#!/usr/bin/env python
"""
Test script for NLP kernel with trial configuration
Tests if the NLP kernel works correctly with trial data
"""

import sys
import os
import json
import torch
import time
from tqdm import tqdm

# Add server directory to path to import kernels
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_test_trial():
    """Create a test trial configuration for Korean hate speech"""
    
    trial = {
        'id': 'test_nlp_trial_001',
        'budget': 10,  # 1 epoch for quick test
        'model': 'bert-multilingual',
        'dataset': 'korean_hate_speech',
        'params': {
            'activation': 'gelu',
            'dropout_probability': 0.1,
            'positional_embedding': 'absolute', 
            'classifier_dropout': 0.1,
            'batch_size': 128,  # Larger batch for A6000
            'learning_rate': 2e-5,
            'weight_decay': 0.01,
            'optimizer': 'adamw',
            'scheduler': 'linear_warmup',
        }
    }
    
    return trial

def test_nlp_kernel():
    """Test NLP kernel with trial configuration"""
    
    print("="*60)
    print("NLP Kernel Trial Test")
    print("="*60)
    
    # Check GPU
    if torch.cuda.is_available():
        print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
        memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"  GPU memory: {memory_gb:.1f} GB")
    else:
        print("⚠ No GPU available - using CPU (will be slower)")
    
    # Create test trial
    trial = create_test_trial()
    print("\nTest Trial Configuration:")
    print(json.dumps(trial, indent=2))
    
    try:
        # Import and create kernel instance
        print("\n" + "="*60)
        print("Testing NLP Kernel Import...")
        print("="*60)
        
        from kernels.nlp_kernel import KernelBase
        print("✓ Successfully imported NLP kernel")
        
        # Create kernel instance
        print("\nCreating kernel instance...")
        kernel = KernelBase(trial)
        print("✓ Kernel instance created successfully")
        print(f"  - Budget: {kernel.budget} epochs")
        print(f"  - Model: {kernel.model}")
        print(f"  - Dataset: {kernel.dataset}")
        print(f"  - Batch size: {kernel.params['batch_size']}")
        print(f"  - Learning rate: {kernel.params['learning_rate']}")
        
        # Run training
        print("\n" + "="*60)
        print("Running Training...")
        print("="*60)
        print("⏱️ Starting training - this may take several minutes with A6000...")
        
        start_time = time.time()
        
        # Add progress indication
        with tqdm(total=1, desc="Training Progress", unit="epoch") as pbar:
            results = kernel.run()
            pbar.update(1)
            
        end_time = time.time()
        training_time_minutes = (end_time - start_time) / 60
        
        print("\n" + "="*60)
        print("Training Results")
        print("="*60)
        print(f"✅ Training completed successfully!")
        print(f"  - Training time: {training_time_minutes:.2f} minutes ({end_time - start_time:.1f} seconds)")
        print(f"  - Final loss: {results['loss']:.4f}")
        print(f"  - Final accuracy: {results['metric']:.4f}")
        print(f"  - Batch size used: {kernel.params['batch_size']}")
        print(f"  - GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
        
        # Validate results
        if results['loss'] > 0 and results['metric'] > 0:
            print("\n✅ Results validation:")
            print("  - Loss is positive (expected)")
            print("  - Accuracy is positive (expected)")
            print("  - Training completed without errors")
        else:
            print("\n⚠ Results validation:")
            print(f"  - Loss: {results['loss']} (should be > 0)")
            print(f"  - Accuracy: {results['metric']} (should be > 0)")
        
        return True, results
        
    except Exception as e:
        print(f"\n❌ Error during NLP kernel test: {e}")
        import traceback
        traceback.print_exc()
        return False, None

def test_different_configurations():
    """Test with different trial configurations"""
    
    print("\n" + "="*60)
    print("Testing Different Configurations")
    print("="*60)
    
    # Test configuration variations
    test_configs = [
        {
            'name': 'AdamW + Linear Warmup',
            'params': {
                'optimizer': 'adamw',
                'scheduler': 'linear_warmup',
                'learning_rate': 2e-5,
                'batch_size': 16
            }
        },
        {
            'name': 'AdamW + Constant',
            'params': {
                'optimizer': 'adamw', 
                'scheduler': 'const',
                'learning_rate': 1e-5,
                'batch_size': 32
            }
        }
    ]
    
    results = []
    
    for i, config in enumerate(test_configs):
        print(f"\nTesting Configuration {i+1}: {config['name']}")
        print("-" * 40)
        
        # Create trial with this configuration
        trial = create_test_trial()
        trial['params'].update(config['params'])
        trial['id'] = f"test_trial_{i+1}"
        
        try:
            from kernels.nlp_kernel import KernelBase
            kernel = KernelBase(trial)
            
            start_time = time.time()
            
            with tqdm(total=1, desc=f"Config {i+1}", unit="epoch") as pbar:
                result = kernel.run()
                pbar.update(1)
                
            end_time = time.time()
            time_minutes = (end_time - start_time) / 60
            
            print(f"✓ Config {i+1} completed:")
            print(f"  - Time: {time_minutes:.2f} minutes ({end_time - start_time:.1f}s)")
            print(f"  - Loss: {result['loss']:.4f}")
            print(f"  - Accuracy: {result['metric']:.4f}")
            print(f"  - Batch size: {kernel.params['batch_size']}")
            
            results.append({
                'config': config['name'],
                'success': True,
                'time': end_time - start_time,
                'loss': result['loss'],
                'accuracy': result['metric']
            })
            
        except Exception as e:
            print(f"❌ Config {i+1} failed: {e}")
            results.append({
                'config': config['name'],
                'success': False,
                'error': str(e)
            })
    
    # Summary
    print("\n" + "="*60)
    print("Configuration Test Summary")
    print("="*60)
    
    successful_configs = [r for r in results if r['success']]
    failed_configs = [r for r in results if not r['success']]
    
    print(f"✅ Successful configurations: {len(successful_configs)}")
    for result in successful_configs:
        print(f"  - {result['config']}: Loss={result['loss']:.4f}, Acc={result['accuracy']:.4f}")
    
    if failed_configs:
        print(f"\n❌ Failed configurations: {len(failed_configs)}")
        for result in failed_configs:
            print(f"  - {result['config']}: {result['error']}")
    
    return results

def main():
    """Main test function"""
    
    print("Starting NLP Kernel Trial Tests")
    print("This will test if the NLP kernel works correctly with trial configurations")
    print()
    
    # Test basic functionality
    success, results = test_nlp_kernel()
    
    if success:
        print("\n🎉 Basic test PASSED!")
        
        # Ask user if they want to test different configurations
        try:
            response = input("\nRun tests with different configurations? (y/n): ").lower()
            if response == 'y':
                config_results = test_different_configurations()
                
                successful_count = len([r for r in config_results if r['success']])
                print(f"\n🎯 Configuration tests completed: {successful_count}/{len(config_results)} successful")
                
        except KeyboardInterrupt:
            print("\nTest interrupted by user")
    else:
        print("\n❌ Basic test FAILED")
        print("Please check the error messages above and fix any issues")
        print("\nCommon issues:")
        print("- Missing dataset files")
        print("- CUDA/GPU issues")
        print("- Missing dependencies")
        print("- Memory issues")
    
    print("\n" + "="*60)
    print("NLP Kernel Trial Test Complete!")
    print("="*60)

if __name__ == "__main__":
    main()