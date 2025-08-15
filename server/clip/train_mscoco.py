import torch
import torch.nn.functional as F
import numpy as np
import os
import sys
from omegaconf import OmegaConf

# Add the current directory to path to ensure imports work correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataloader.dataset import CLIP_COCO_dataset
from dataloader.data_loaders import get_dataloader

from model.model import CLIP
from utils.simple_tokenizer import SimpleTokenizer
from utils.custom_schedulers import get_cosine_schedule_with_warmup, get_cosine_with_hard_restarts_schedule_with_warmup
from utils import set_seed, mkdir, setup_logger, load_config_file

from torch.optim import Adam, AdamW # both are same but AdamW has a default weight decay

import argparse

DATA_CONFIG_PATH = 'dataloader/data_config.yaml'
TRAINER_CONFIG_PATH = 'trainer/train_config.yaml'
MODEL_CONFIG_PATH = 'model/model_config.yaml'

def train(config, train_dataset, model, logger): 
    
    config.train_batch_size = config.per_gpu_train_batch_size * max(1, config.n_gpu)    
    train_dataloader = get_dataloader(config, train_dataset, is_train=True)

    # total training iterations
    t_total = len(train_dataloader) // config.gradient_accumulation_steps \
                * config.num_train_epochs
    
    optimizer = AdamW(model.parameters(), lr=config.optimizer.params.lr, eps=config.optimizer.params.eps, weight_decay=config.optimizer.params.weight_decay)

    # Warmup iterations = 20% of total iterations
    num_warmup_steps = int(0.20 * t_total)
    scheduler = get_cosine_schedule_with_warmup(optimizer, num_warmup_steps= num_warmup_steps, num_training_steps= t_total)

    if config.n_gpu > 1:
        model = torch.nn.DataParallel(model)
    
    model = model.to(torch.device(config.device))
    model.train()
    
    logger.info("***** Running training *****")
    logger.info("  Num examples = %d", len(train_dataset))
    logger.info("  Num Epochs = %d", config.num_train_epochs)
    logger.info("  Number of GPUs = %d", config.n_gpu)

    logger.info("  Batch size per GPU = %d", config.per_gpu_train_batch_size)
    logger.info("  Total train batch size (w. parallel, & accumulation) = %d",
                   config.train_batch_size * config.gradient_accumulation_steps)
    logger.info("  Gradient Accumulation steps = %d", config.gradient_accumulation_steps)
    logger.info("  Total optimization steps = %d", t_total)
    if scheduler:
        logger.info("  warmup steps = %d", num_warmup_steps)
        
    global_step, global_loss, global_acc =0,  0.0, 0.0
    model.zero_grad()
    
    for epoch in range(int(config.num_train_epochs)): 
        for step, batch in enumerate(train_dataloader): 
            input_image, input_texts = batch 
            
            input_images = input_image.to(torch.device(config.device)) 
            input_texts = input_texts.to(torch.device(config.device)) 
            
            image_features, text_features = model(input_images, input_texts) 
            
            # normalize features 
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            if config.n_gpu == 1: 
                logit_scale = model.logit_scale.exp() 
            elif config.n_gpu > 1: 
                logit_scale = model.module.logit_scale.exp()
            
            # image 기준, 텍스트와 유사도 [N, N]
            logits_per_image = logit_scale * image_features @ text_features.t()
            # text 기준, 이미지와 유사도 [N, N]
            logits_per_text = logit_scale * text_features @ image_features.t()
            # i번째 image의 정답은 항상 i번째 텍스트 -> 정답이 항상 대각선 
            labels = torch.arange(len(logits_per_image)).to(logits_per_image.device)

            # CrossEntropyLoss는 알아서 정답인 index는 올리고 # 나머지 index는 낮추는 방향으로 loss를 계산해줌
            image_loss = F.cross_entropy(logits_per_image, labels) 
            text_loss = F.cross_entropy(logits_per_text, labels)
            
            loss = (image_loss + text_loss) / 2

            if config.n_gpu > 1: 
                loss = loss.mean() # mean() to average on multi-gpu parallel training
            # step마다 loss를 gradient로 업데이트하기 위해서 loss를 step수로 나누어 줌
            if config.gradient_accumulation_steps > 1:
                loss = loss / config.gradient_accumulation_steps
            
            loss.backward() # 미분값 계산만 함 
            
            global_loss += loss.item()
            
            if (step + 1) % config.gradient_accumulation_steps == 0:
                global_step += 1
                optimizer.step() # PYTORCH 1.x : call optimizer.step() first then scheduler.step()
                
                # logit scaling set as max 100 as mentioned in CLIP paper # log(100) = 4.6052
                if config.n_gpu == 1:
                    model.logit_scale.data = torch.clamp(model.logit_scale.data, 0, 4.6052)
                elif config.n_gpu > 1:
                    model.module.logit_scale.data = torch.clamp(model.module.logit_scale.data, 0, 4.6052)

                if scheduler:
                    scheduler.step() 
                    
                model.zero_grad()

                if global_step % config.logging_steps == 0:
                    logger.info("Epoch: {}, global_step: {}, lr: {:.6f}, loss: {:.4f} ({:.4f})".format(epoch, global_step, 
                        optimizer.param_groups[0]["lr"], loss.item(), global_loss / global_step)
                    )

                if (config.save_steps > 0 and global_step % config.save_steps == 0) or \
                        global_step == t_total:
                    # saving checkpoint
                    save_checkpoint(config, epoch, global_step, model, optimizer, logger) 
                    

    return global_step, global_loss / global_step

def save_checkpoint(config, epoch, global_step, model, optimizer, logger):
    '''
    Checkpointing. Saves model and optimizer state_dict() and current epoch and global training steps.
    '''
    checkpoint_path = os.path.join(config.saved_checkpoints, f'checkpoint_{epoch}_{global_step}.pt')
    save_num = 0
    while (save_num < 10):
        try:

            if config.n_gpu > 1:
                torch.save({
                    'epoch' : epoch,
                    'global_step' : global_step,
                    'model_state_dict' : model.module.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict()
                }, checkpoint_path)
            else:
                torch.save({
                    'epoch' : epoch,
                    'global_step' : global_step,
                    'model_state_dict' : model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict()
                }, checkpoint_path)

            logger.info("Save checkpoint to {}".format(checkpoint_path))
            break
        except:
            save_num += 1
    if save_num == 10:
        logger.info("Failed to save checkpoint after 10 trails.")
    return

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cuda_devices', type=str, default="0,1,3,4,5", help='CUDA visible devices')
    parser.add_argument('--train_img_dir', type=str, default=None, help='Path to training images')
    parser.add_argument('--train_annotation_file', type=str, default=None, help='Path to training annotations')
    args = parser.parse_args()
    
    os.environ["CUDA_VISIBLE_DEVICES"] = args.cuda_devices

    data_config = load_config_file(DATA_CONFIG_PATH)
    train_config = load_config_file(TRAINER_CONFIG_PATH)
    model_config = load_config_file(MODEL_CONFIG_PATH)

    config = OmegaConf.merge(train_config, data_config)

    # Override paths if provided via command line
    if args.train_img_dir:
        config.train_img_dir = args.train_img_dir
    if args.train_annotation_file:
        config.train_annotation_file = args.train_annotation_file
        
    # creating directories for saving checkpoints and logs
    mkdir(path=config.saved_checkpoints)
    mkdir(path=config.logs)

    logger = setup_logger("CLIP_COCO_TRAIN", config.logs, 0, filename = "training_logs.txt")

    config.device = "cuda" if torch.cuda.is_available() else "cpu"
    config.n_gpu = torch.cuda.device_count()
    set_seed(seed=11, n_gpu=config.n_gpu)

    logger.info(f"Using configuration:")
    logger.info(f"  train_img_dir: {config.train_img_dir}")
    logger.info(f"  train_annotation_file: {config.train_annotation_file}")
    logger.info(f"  device: {config.device}")
    logger.info(f"  n_gpu: {config.n_gpu}")

    # getting text tokenizer
    tokenizer = SimpleTokenizer()

    # creating RN50 CLIP model
    model_params = dict(model_config.RN50)
    model_params['vision_layers'] = tuple(model_params['vision_layers'])
    model_params['vision_patch_size'] = None
    model = CLIP(**model_params)

    logger.info(f"Training/evaluation parameters {train_config}")

    # getting dataset for training
    train_dataset = CLIP_COCO_dataset(config, tokenizer)
    logger.info(f"Loaded dataset with {len(train_dataset)} samples")

    # Now training
    global_step, avg_loss = train(config, train_dataset, model, logger)

    logger.info("Training done: total_step = %s, avg loss = %s", global_step, avg_loss)

if __name__ == "__main__":
    main()