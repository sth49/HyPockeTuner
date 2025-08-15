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

# 1개의 이미지에 대해 여러 단계의 전처리 수행 
def _transform(n_px): # n_px: image size
    return Compose([ # 여러개의 전처리를 묶는 함수 
        # 짧은 변 224로 resize
        Resize(n_px, interpolation=Image.BICUBIC), # 모델에 입력하기 위해 크기 고정 
        CenterCrop(n_px), # 중심에서 224로 잘라냄 
        lambda image: image.convert("RGB"), # 흑백이미지 강제 RGB 처리 
        ToTensor(),
        Normalize((0.4225, 0.4012, 0.3659), (0.2681, 0.2635, 0.2763)), # COCO mean, std
    ])

# COCO dataset 예시
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

# image_id로 image path와 caption 추출 
def get_img_id_to_img_path(annotations): 
    img_id_to_img_path = {}
    # img_info: 1개의 image에 대한 딕셔너리 
    for img_info in annotations['images']: 
        img_id = img_info['id'] # image 고유 숫자
        file_name = img_info['file_name'] # 실제 imgage 파일 이름 
        img_id_to_img_path[img_id] = file_name # {image_id: image_path} 형태로 저장
    return img_id_to_img_path

def get_img_id_to_captions(annotations): 
    img_id_to_captions = {}  
    for caption_info in annotations['annotations']: 
        img_id = caption_info['image_id'] 
        if img_id not in img_id_to_captions: 
            img_id_to_captions[img_id] = [] # 이미지에 대한 캡션 리스트 초기화 
        
        caption = caption_info['caption'] 
        img_id_to_captions[img_id].append(caption) # {image_id: [caption1, caption2, ...]} 형태로 저장
    
    return img_id_to_captions

class CLIP_COCO_dataset(Dataset):
# COCO dataset을 CLIP 모델에 맞게 전처리하는 클래스    
    def __init__(self, config, text_tokenizer, context_length=77, input_resolution=224):
        
        super(CLIP_COCO_dataset, self).__init__()
        self.config = config
        
        annotation_file = self.config.train_annotation_file
        annotations = read_json(annotation_file)
        
        self.img_id_to_filename = get_img_id_to_img_path(annotations)
        self.img_id_to_captions = get_img_id_to_captions(annotations)    

        self.img_ids = list(self.img_id_to_filename.keys()) # image_id 리스트 
        
        self.img_dir = self.config.train_img_dir # 이미지가 저장된 디렉토리 
        
        self.transform = _transform(input_resolution) # 이미지 전처리 함수
        self._tokenizer = text_tokenizer 
        self.context_length = context_length 
    
    # 자연어 문장을 모델 입력에 사용할 고정 길이 토큰 시퀀스로 바꿔주는 함수 
    def tokenize(self, text): 
        sot_token = self._tokenizer.encoder['<|startoftext|>'] # 시작 토큰 
        eos_token = self._tokenizer.encoder['<|endoftext|>'] # 종료 토큰 
        tokens = [sot_token] + self._tokenizer.encode(text) + [eos_token] # 시작, 종료 토큰 추가
        result = torch.zeros(self.context_length, dtype=torch.long) 
        # 토큰 시퀀스의 길이가 context_length보다 짧으면 0으로 채움
        result[:len(tokens)] = torch.tensor(tokens)
        return result 
    
    def __len__(self):
        return len(self.img_ids) 
    
    def __getitem__(self, idx): 
        img_id = self.img_ids[idx] # 이미지 고유 숫자 

        # 랜덤하게 캡션 선택
        text = random.choice(self.img_id_to_captions[img_id])
        
        img_filename = self.img_id_to_filename[img_id] # 이미지 파일 이름 
        
        img_path = op.join(self.img_dir, img_filename) # 이미지 파일 경로 
        img = Image.open(img_path)
        img_input = self.transform(img) # 이미지 전처리 
        text_input = self.tokenize(text) # 캡션 토큰화  
        
        return img_input, text_input 
        