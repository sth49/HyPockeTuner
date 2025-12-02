# dataloader here
from torch.utils.data import Dataset

from PIL import Image
from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize
from omegaconf import OmegaConf
import os.path as op
import random
import torch
import numpy as np
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.util import load_config_file, read_json, load_from_yaml_file

# Convert image to RGB - separate function to avoid pickle issues
def _convert_to_rgb(image):
    return image.convert("RGB")


def _transform(n_px): # n_px: image size
    return Compose([
        
        Resize(n_px, interpolation=Image.BICUBIC),
        CenterCrop(n_px),
        _convert_to_rgb,
        ToTensor(),
        Normalize((0.4225, 0.4012, 0.3659), (0.2681, 0.2635, 0.2763)), # COCO mean, std
    ])


# {
#   "images": [
#     {
#       "id": 42,
#       "file_name": "000000000042.jpg",
#       ...
#     },
#     ...
#   ],
#   "annotations": [
#     {
#       "image_id": 42,
#       "bbox": [...],
#       ...
#     },
#     ...
#   ]
# }


def get_img_id_to_img_path(annotations): 
    img_id_to_img_path = {}
    
    for img_info in annotations['images']: 
        img_id = img_info['id']
        file_name = img_info['file_name']
        img_id_to_img_path[img_id] = file_name
    return img_id_to_img_path

def get_img_id_to_captions(annotations): 
    img_id_to_captions = {}  
    for caption_info in annotations['annotations']: 
        img_id = caption_info['image_id'] 
        if img_id not in img_id_to_captions: 
            img_id_to_captions[img_id] = []
        
        caption = caption_info['caption'] 
        img_id_to_captions[img_id].append(caption)
    
    return img_id_to_captions

class CLIP_COCO_dataset(Dataset):

    def __init__(self, config, text_tokenizer, context_length=77, input_resolution=224):
        
        super(CLIP_COCO_dataset, self).__init__()
        self.config = config
        
        annotation_file = self.config.train_annotation_file
        annotations = read_json(annotation_file)
        
        self.img_id_to_filename = get_img_id_to_img_path(annotations)
        self.img_id_to_captions = get_img_id_to_captions(annotations)    

        self.img_ids = list(self.img_id_to_filename.keys())
        
        self.img_dir = self.config.train_img_dir
        
        self.transform = _transform(input_resolution)
        self._tokenizer = text_tokenizer 
        self.context_length = context_length 
    
    
    def tokenize(self, text): 
        sot_token = self._tokenizer.encoder['<|startoftext|>']
        eos_token = self._tokenizer.encoder['<|endoftext|>']
        tokens = [sot_token] + self._tokenizer.encode(text) + [eos_token]
        result = torch.zeros(self.context_length, dtype=torch.long) 
        
        result[:len(tokens)] = torch.tensor(tokens)
        return result 
    
    def __len__(self):
        return len(self.img_ids) 
    
    def __getitem__(self, idx): 
        img_id = self.img_ids[idx]

        
        text = random.choice(self.img_id_to_captions[img_id])
        
        img_filename = self.img_id_to_filename[img_id]
        
        img_path = op.join(self.img_dir, img_filename)
        img = Image.open(img_path)
        img_input = self.transform(img)
        text_input = self.tokenize(text)
        
        return img_input, text_input 
        