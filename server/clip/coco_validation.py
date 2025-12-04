#!/usr/bin/env python
"""MS COCO Validation for CLIP Model - Image-Text Retrieval Evaluation"""

import os
import torch
import numpy as np
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize
from tqdm import tqdm
import random
import json

# Convert image to RGB - separate function to avoid pickle issues
def _convert_to_rgb(image):
    return image.convert("RGB")

def _transform(n_px):
    return Compose([
        Resize(n_px, interpolation=Image.BICUBIC),
        CenterCrop(n_px),
        _convert_to_rgb,
        ToTensor(),
        Normalize((0.4225, 0.4012, 0.3659), (0.2681, 0.2635, 0.2763)),  # COCO mean, std
    ])

def tokenize(texts, tokenizer, context_length=77):
    """Tokenize text using CLIP tokenizer"""
    if isinstance(texts, str):
        texts = [texts]

    sot_token = tokenizer.encoder["<|startoftext|>"]
    eot_token = tokenizer.encoder["<|endoftext|>"]
    all_tokens = [[sot_token] + tokenizer.encode(text) + [eot_token] for text in texts]
    result = torch.zeros(len(all_tokens), context_length, dtype=torch.long)

    for i, tokens in enumerate(all_tokens):
        if len(tokens) > context_length:
            tokens = tokens[:context_length]
            tokens[-1] = eot_token
        result[i, :len(tokens)] = torch.tensor(tokens)

    return result

class COCOValidationDataset(Dataset):
    """COCO Validation Dataset for Image-Text Retrieval"""
    
    def __init__(self, val_img_dir, val_annotation_file, tokenizer, 
                 input_resolution=224, context_length=77, max_samples=1000):
        self.val_img_dir = val_img_dir
        self.tokenizer = tokenizer
        self.context_length = context_length
        self.transform = _transform(input_resolution)
        
        # Load validation annotations
        with open(val_annotation_file, 'r') as f:
            annotations = json.load(f)
        
        # Build image_id to filename mapping
        self.img_id_to_filename = {}
        for img_info in annotations['images']:
            img_id = img_info['id']
            filename = img_info['file_name']
            self.img_id_to_filename[img_id] = filename
        
        # Build image_id to captions mapping
        self.img_id_to_captions = {}
        for caption_info in annotations['annotations']:
            img_id = caption_info['image_id']
            caption = caption_info['caption']
            
            if img_id not in self.img_id_to_captions:
                self.img_id_to_captions[img_id] = []
            self.img_id_to_captions[img_id].append(caption)
        
        # Filter images that have both image file and captions
        valid_img_ids = []
        for img_id in self.img_id_to_filename.keys():
            if img_id in self.img_id_to_captions:
                img_path = os.path.join(self.val_img_dir, self.img_id_to_filename[img_id])
                if os.path.exists(img_path):
                    valid_img_ids.append(img_id)
        
        # Limit samples for faster evaluation
        if max_samples and len(valid_img_ids) > max_samples:
            valid_img_ids = random.sample(valid_img_ids, max_samples)
        
        self.img_ids = valid_img_ids
        print(f"✅ COCO Validation: {len(self.img_ids)} images loaded")
    
    def __len__(self):
        return len(self.img_ids)
    
    def __getitem__(self, idx):
        img_id = self.img_ids[idx]
        
        # Load and transform image
        filename = self.img_id_to_filename[img_id]
        img_path = os.path.join(self.val_img_dir, filename)
        image = Image.open(img_path)
        image_tensor = self.transform(image)
        
        # Get all captions for this image
        captions = self.img_id_to_captions[img_id]
        
        return image_tensor, captions, img_id

def compute_retrieval_metrics(image_features, text_features, k_values=[1, 5, 10]):
    """
    Compute Image-to-Text and Text-to-Image retrieval metrics
    Args:
        image_features: [N, D] normalized image features
        text_features: [N, D] normalized text features (averaged across captions)
        k_values: List of k values for Recall@k
    """
    # Compute similarity matrix
    similarity_matrix = image_features @ text_features.T  # [N, N]
    
    metrics = {}
    
    # Image-to-Text Retrieval (I2T)
    i2t_ranks = []
    for i in range(len(image_features)):
        # Get similarities for image i with all texts
        similarities = similarity_matrix[i]  # [N]
        # Rank of correct text (index i)
        sorted_indices = torch.argsort(similarities, descending=True)
        rank = (sorted_indices == i).nonzero(as_tuple=True)[0].item() + 1
        i2t_ranks.append(rank)
    
    # Text-to-Image Retrieval (T2I)
    t2i_ranks = []
    for j in range(len(text_features)):
        # Get similarities for text j with all images
        similarities = similarity_matrix[:, j]  # [N]
        # Rank of correct image (index j)
        sorted_indices = torch.argsort(similarities, descending=True)
        rank = (sorted_indices == j).nonzero(as_tuple=True)[0].item() + 1
        t2i_ranks.append(rank)
    
    # Calculate Recall@k for both directions
    i2t_ranks = torch.tensor(i2t_ranks)
    t2i_ranks = torch.tensor(t2i_ranks)
    
    for k in k_values:
        i2t_recall_k = (i2t_ranks <= k).float().mean().item() * 100
        t2i_recall_k = (t2i_ranks <= k).float().mean().item() * 100
        
        metrics[f'I2T_R@{k}'] = i2t_recall_k
        metrics[f'T2I_R@{k}'] = t2i_recall_k
    
    # Mean rank
    metrics['I2T_MeanRank'] = i2t_ranks.float().mean().item()
    metrics['T2I_MeanRank'] = t2i_ranks.float().mean().item()
    
    # Median rank
    metrics['I2T_MedianRank'] = i2t_ranks.float().median().item()
    metrics['T2I_MedianRank'] = t2i_ranks.float().median().item()
    
    return metrics

def evaluate_coco_retrieval(model, tokenizer, val_img_dir, val_annotation_file, 
                          device='cuda', batch_size=32, max_samples=1000):
    """
    Evaluate CLIP model on COCO validation set for image-text retrieval
    """
    print("🔍 Starting COCO Validation Evaluation...")
    
    # Create validation dataset
    val_dataset = COCOValidationDataset(
        val_img_dir=val_img_dir,
        val_annotation_file=val_annotation_file,
        tokenizer=tokenizer,
        max_samples=max_samples
    )
    
    if len(val_dataset) == 0:
        print("❌ No valid samples found in COCO validation set")
        return {}
    
    val_dataloader = DataLoader(val_dataset, batch_size=1, shuffle=False, num_workers=2)
    
    model.eval()
    all_image_features = []
    all_text_features = []
    
    print(f"📊 Processing {len(val_dataset)} image-text pairs...")
    
    with torch.no_grad():
        for batch_idx, (images, captions_list, img_ids) in enumerate(tqdm(val_dataloader, desc="🎯 COCO Eval")):
            # Process image
            images = images.to(device)
            image_features = model.encode_image(images)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Process captions (average multiple captions per image)
            captions = captions_list[0]  # Get captions for first (and only) image in batch
            
            # Tokenize all captions for this image
            caption_tokens = tokenize(captions, tokenizer).to(device)
            caption_features = model.encode_text(caption_tokens)
            caption_features = caption_features / caption_features.norm(dim=-1, keepdim=True)
            
            # Average caption features
            text_features = caption_features.mean(dim=0, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            all_image_features.append(image_features.cpu())
            all_text_features.append(text_features.cpu())
    
    # Concatenate all features
    all_image_features = torch.cat(all_image_features, dim=0)  # [N, D]
    all_text_features = torch.cat(all_text_features, dim=0)    # [N, D]
    
    # Compute retrieval metrics
    print("📈 Computing retrieval metrics...")
    metrics = compute_retrieval_metrics(all_image_features, all_text_features)
    
    return metrics

def print_coco_metrics(metrics):
    """Pretty print COCO validation metrics"""
    if not metrics:
        print("❌ No metrics to display")
        return
    
    print("\n" + "="*60)
    print("📊 MS COCO VALIDATION RESULTS")
    print("="*60)
    
    print("\n🔄 IMAGE-TO-TEXT RETRIEVAL:")
    for k in [1, 5, 10]:
        if f'I2T_R@{k}' in metrics:
            print(f"   R@{k:2d}: {metrics[f'I2T_R@{k}']:6.2f}%")
    
    print("\n🔄 TEXT-TO-IMAGE RETRIEVAL:")
    for k in [1, 5, 10]:
        if f'T2I_R@{k}' in metrics:
            print(f"   R@{k:2d}: {metrics[f'T2I_R@{k}']:6.2f}%")
    
    print(f"\n📈 RANKING PERFORMANCE:")
    if 'I2T_MeanRank' in metrics:
        print(f"   I2T Mean Rank: {metrics['I2T_MeanRank']:8.1f}")
    if 'T2I_MeanRank' in metrics:
        print(f"   T2I Mean Rank: {metrics['T2I_MeanRank']:8.1f}")
    
    # Calculate average performance
    i2t_avg = (metrics.get('I2T_R@1', 0) + metrics.get('I2T_R@5', 0) + metrics.get('I2T_R@10', 0)) / 3
    t2i_avg = (metrics.get('T2I_R@1', 0) + metrics.get('T2I_R@5', 0) + metrics.get('T2I_R@10', 0)) / 3
    overall_avg = (i2t_avg + t2i_avg) / 2
    
    print(f"\n🎯 SUMMARY:")
    print(f"   I2T Average: {i2t_avg:6.2f}%")
    print(f"   T2I Average: {t2i_avg:6.2f}%")
    print(f"   Overall:     {overall_avg:6.2f}%")
    print("="*60)

# Quick test function
def quick_coco_validation_test():
    """Quick test of COCO validation with dummy data"""
    print("🧪 Quick COCO Validation Test...")
    
    # Test data paths (relative to server directory)
    base_dir = os.path.dirname(os.path.dirname(__file__))
    val_img_dir = os.path.join(base_dir, 'data', 'mscoco', 'val2017')
    val_annotation_file = os.path.join(base_dir, 'data', 'mscoco', 'annotations', 'captions_val2017.json')
    
    # Check if files exist
    if not os.path.exists(val_img_dir):
        print(f"❌ Validation image directory not found: {val_img_dir}")
        return False
    
    if not os.path.exists(val_annotation_file):
        print(f"❌ Validation annotation file not found: {val_annotation_file}")
        return False
    
    print(f"✅ Validation image directory exists: {val_img_dir}")
    print(f"✅ Validation annotation file exists: {val_annotation_file}")
    
    return True

if __name__ == "__main__":
    quick_coco_validation_test()