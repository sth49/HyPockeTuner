import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.simple_tokenizer import SimpleTokenizer
from omegaconf import OmegaConf
from utils import load_config_file

DATA_CONFIG_PATH = 'dataloader/data_config.yaml'

# Test 1: Check if tokenizer loads
print("Testing tokenizer...")
try:
    tokenizer = SimpleTokenizer()
    print("✓ Tokenizer loaded successfully")
except Exception as e:
    print(f"✗ Tokenizer failed: {e}")

# Test 2: Check data config
print("\nTesting data config...")
data_config = load_config_file(DATA_CONFIG_PATH)
print(f"train_img_dir: {data_config.train_img_dir}")
print(f"train_annotation_file: {data_config.train_annotation_file}")

# Test 3: Check if files exist
print("\nChecking if files exist...")
if os.path.exists(data_config.train_img_dir):
    print(f"✓ Image directory exists: {data_config.train_img_dir}")
else:
    print(f"✗ Image directory not found: {data_config.train_img_dir}")

if os.path.exists(data_config.train_annotation_file):
    print(f"✓ Annotation file exists: {data_config.train_annotation_file}")
else:
    print(f"✗ Annotation file not found: {data_config.train_annotation_file}")

# Test 4: Try loading dataset
print("\nTesting dataset loading...")
try:
    from dataloader.dataset import CLIP_COCO_dataset
    from omegaconf import OmegaConf
    
    train_config = load_config_file('trainer/train_config.yaml')
    config = OmegaConf.merge(train_config, data_config)
    
    dataset = CLIP_COCO_dataset(config, tokenizer)
    print(f"✓ Dataset loaded successfully with {len(dataset)} samples")
    
    # Test getting a sample
    sample = dataset[0]
    print(f"✓ Successfully retrieved a sample")
except Exception as e:
    print(f"✗ Dataset loading failed: {e}")
    import traceback
    traceback.print_exc()