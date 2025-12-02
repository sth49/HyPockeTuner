import numpy as np
import torch
import torch.nn.functional as F
from torch.optim import AdamW
import os
import sys

# Set multiprocessing start method to avoid issues
try:
    import torch.multiprocessing as mp
    mp.set_start_method('spawn', force=True)
except RuntimeError:
    pass

# Add CLIP module path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'clip'))

from model.model import CLIP
from dataloader.dataset import CLIP_COCO_dataset
from dataloader.data_loaders import get_dataloader
from utils.simple_tokenizer import SimpleTokenizer
from utils.custom_schedulers import get_cosine_schedule_with_warmup
from utils import load_config_file
from omegaconf import OmegaConf

# Import evaluation functions with error handling
try:
    import torchvision
    from torch.utils.data import DataLoader, SequentialSampler
    from torchvision.transforms import Compose, Resize, CenterCrop, ToTensor, Normalize
    from PIL import Image
    from tqdm import tqdm
    EVAL_IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Some evaluation imports failed: {e}")
    EVAL_IMPORTS_AVAILABLE = False
    # Fallback tqdm if not available
    try:
        from tqdm import tqdm
    except ImportError:
        def tqdm(iterable, **kwargs):
            return iterable

# Import COCO validation
try:
    from coco_validation import evaluate_coco_retrieval, print_coco_metrics
    COCO_VALIDATION_AVAILABLE = True
    print("✅ COCO validation module imported successfully")
except ImportError as e:
    print(f"Warning: COCO validation import failed: {e}")
    COCO_VALIDATION_AVAILABLE = False

# Import ImageNet classes and templates
try:
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'clip', 'zero_shot'))
    from class_names_and_templates import imagenet_classes, imagenet_templates
    IMAGENET_IMPORTS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ImageNet imports failed: {e}")
    IMAGENET_IMPORTS_AVAILABLE = False
    # Fallback minimal classes if import fails
    imagenet_classes = ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"]
    imagenet_templates = ["a photo of a {}."]

SEED = 123
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

# Evaluation functions from eval.py
def tokenize(texts, tokenizer, context_length=77):
    if isinstance(texts, str):
        texts = [texts]

    sot_token = tokenizer.encoder["<|startoftext|>"]
    eot_token = tokenizer.encoder["<|endoftext|>"]
    all_tokens = [[sot_token] + tokenizer.encode(text) + [eot_token] for text in texts]
    result = torch.zeros(len(all_tokens), context_length, dtype=torch.long)

    for i, tokens in enumerate(all_tokens):
        if len(tokens) > context_length:
            raise RuntimeError(f"Input {texts[i]} is too long for context length {context_length}")
        result[i, :len(tokens)] = torch.tensor(tokens)

    return result

def zeroshot_classifier(model, classnames, templates, tokenizer, device):
    with torch.no_grad():
        zeroshot_weights = []
        for classname in classnames:
            texts = [template.format(classname) for template in templates]
            texts = tokenize(texts, tokenizer).to(device)
            class_embeddings = model.encode_text(texts)
            class_embeddings /= class_embeddings.norm(dim=-1, keepdim=True)
            class_embedding = class_embeddings.mean(dim=0)
            class_embedding /= class_embedding.norm()
            zeroshot_weights.append(class_embedding)
        zeroshot_weights = torch.stack(zeroshot_weights, dim=1).to(device)
    return zeroshot_weights

def evaluate_coco_validation(model, config):
    """Evaluate model using MS COCO validation image-text retrieval"""
    if not COCO_VALIDATION_AVAILABLE:
        print("COCO validation not available, skipping...")
        return {}
    
    try:
        print("🔍 Running COCO validation evaluation...")
        device = torch.device(config.device)
        
        # COCO validation paths - configure based on your data location
        val_img_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data/mscoco/val2017')
        val_annotation_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data/mscoco/annotations/captions_val2017.json')
        
        # Check if validation data exists
        if not os.path.exists(val_img_dir) or not os.path.exists(val_annotation_file):
            print(f"❌ COCO validation data not found:")
            print(f"   Image dir: {val_img_dir}")
            print(f"   Annotations: {val_annotation_file}")
            return {}
        
        # Initialize tokenizer
        tokenizer = SimpleTokenizer()
        
        # Get model for evaluation
        eval_model = model.module if hasattr(model, 'module') else model
        eval_model.eval()
        
        # Run COCO retrieval evaluation
        metrics = evaluate_coco_retrieval(
            model=eval_model,
            tokenizer=tokenizer,
            val_img_dir=val_img_dir,
            val_annotation_file=val_annotation_file,
            device=device,
            batch_size=1,
            max_samples=500  # Use 500 samples for reasonable speed
        )
        
        # Print results
        print_coco_metrics(metrics)
        
        # Return overall average score
        if metrics:
            i2t_avg = (metrics.get('I2T_R@1', 0) + metrics.get('I2T_R@5', 0) + metrics.get('I2T_R@10', 0)) / 3
            t2i_avg = (metrics.get('T2I_R@1', 0) + metrics.get('T2I_R@5', 0) + metrics.get('T2I_R@10', 0)) / 3
            overall_avg = (i2t_avg + t2i_avg) / 2
            return overall_avg
        else:
            return 0.0
        
    except Exception as e:
        print(f"❌ Error during COCO validation: {e}")
        import traceback
        traceback.print_exc()
        return 0.0

def evaluate_zero_shot_cifar10(model, config):
    """Evaluate model using zero-shot classification on CIFAR-10"""
    if not EVAL_IMPORTS_AVAILABLE:
        print("Evaluation imports not available, using fallback metric")
        return 50.0
    
    try:
        print("Starting zero-shot evaluation on CIFAR-10...")
        device = torch.device(config.device)
        
        # CIFAR-10 normalization values
        def convert_rgb(image):
            return image.convert("RGB")
        
        transform = Compose([
            Resize(224, interpolation=Image.BICUBIC),
            CenterCrop(224),
            convert_rgb,
            ToTensor(),
            Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711)),
        ])
        
        print("Loading CIFAR-10 dataset...")
        # Load CIFAR-10 test dataset
        eval_dataset = torchvision.datasets.CIFAR10(
            root='/tmp/cifar10', train=False, download=True, transform=transform
        )
        
        # Use subset for faster evaluation
        subset_size = min(1000, len(eval_dataset))  # More samples since CIFAR-10 is easier
        subset_indices = torch.randperm(len(eval_dataset))[:subset_size]
        eval_subset = torch.utils.data.Subset(eval_dataset, subset_indices)
        
        # Evaluation dataloader
        eval_dataloader = DataLoader(eval_subset, batch_size=32, shuffle=False, 
                                   num_workers=0, pin_memory=torch.cuda.is_available())
        
        # CIFAR-10 class names
        cifar10_classes = [
            "airplane", "automobile", "bird", "cat", "deer", 
            "dog", "frog", "horse", "ship", "truck"
        ]
        
        # CIFAR-10 templates (simpler than ImageNet)
        cifar10_templates = [
            "a photo of a {}.",
            "a image of a {}.",
            "a picture of a {}.",
        ]
        
        print(f"Using {len(cifar10_classes)} CIFAR-10 classes with {len(cifar10_templates)} templates")
        
        # Initialize tokenizer
        tokenizer = SimpleTokenizer()
        
        # Get model for evaluation
        eval_model = model.module if hasattr(model, 'module') else model
        eval_model.eval()
        
        print("Computing zero-shot weights...")
        # Get zero-shot weights
        zeroshot_weights = zeroshot_classifier(eval_model, cifar10_classes, cifar10_templates, tokenizer, device)
        
        correct = 0
        total = 0
        
        print(f"Running evaluation on {subset_size} CIFAR-10 samples...")
        with torch.no_grad():
            eval_pbar = tqdm(eval_dataloader, desc="🎯 CIFAR-10 Eval", 
                           total=len(eval_dataloader), unit="batch",
                           bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]')
            
            for i, (images, labels) in enumerate(eval_pbar):
                image_input = images.to(device)
                image_features = eval_model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                similarity = (100.0 * image_features @ zeroshot_weights).softmax(dim=-1)
                
                _, predicted = similarity.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels.to(device)).sum().item()
                
                # Update progress bar with current accuracy
                current_acc = 100.0 * correct / total if total > 0 else 0.0
                eval_pbar.set_postfix({'Acc': f'{current_acc:.1f}%'})
        
        accuracy = 100.0 * correct / total
        print(f"CIFAR-10 evaluation completed: {correct}/{total} correct, accuracy: {accuracy:.2f}%")
        return accuracy
    
    except Exception as e:
        print(f"CIFAR-10 evaluation failed with error: {e}")
        import traceback
        traceback.print_exc()
        print("Using fallback metric value of 50.0")
        return 50.0


def evaluate_zero_shot(model, config):
    """Evaluate model using COCO Retrieval as primary metric with CIFAR-10 backup"""
    
    # Check if we should use CIFAR-10 instead (easier evaluation)
    # use_cifar10 = getattr(config, 'eval_dataset', 'imagenet-a') == 'cifar10'
    
    # if use_cifar10:
        # Run COCO validation as PRIMARY metric
    print("\n" + "="*60)
    print("🎯 Running COCO validation (Primary Metric)...")
    coco_score = evaluate_coco_validation(model, config)
    
    # Run CIFAR-10 as secondary/backup metric
    # print(f"\n📊 Running CIFAR-10 evaluation (Secondary Metric)...")
    # cifar_accuracy = evaluate_zero_shot_cifar10(model, config)
    
    print("\n" + "="*60)
    print("📊 EVALUATION SUMMARY:")
    if coco_score > 0:
        print(f"🎯 Primary - COCO Retrieval Score: {coco_score:.2f}%")
    #     print(f"📊 Secondary - CIFAR-10 Accuracy: {cifar_accuracy:.2f}%")
    #     print("="*60)
        
    #     # 🎯 RETURN COCO SCORE AS PRIMARY METRIC
    #     return coco_score
    # else:
    #     print(f"❌ COCO evaluation failed, using CIFAR-10 fallback")
    #     print(f"📊 Fallback - CIFAR-10 Accuracy: {cifar_accuracy:.2f}%")
    #     print("="*60)
    #     return cifar_accuracy
    
    # Original ImageNet-A evaluation
    if not EVAL_IMPORTS_AVAILABLE:
        print("Evaluation imports not available, using fallback metric")
        return 50.0
    return coco_score  # Return COCO score as primary metric
    # try:
    #     print("Starting zero-shot evaluation on ImageNet-A...")
    #     device = torch.device(config.device)
        
    #     # ImageNet normalization values  
    #     def convert_rgb(image):
    #         return image.convert("RGB")
        
    #     transform = Compose([
    #         Resize(224, interpolation=Image.BICUBIC),
    #         CenterCrop(224),
    #         convert_rgb,
    #         ToTensor(),
    #         Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711)),
    #     ])
        
    #     print("Loading ImageNet-A dataset...")
    #     # Use ImageNet-A dataset from data folder
    #     imagenet_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'imagenet-a')
        
    #     if not os.path.exists(imagenet_path):
    #         print(f"ImageNet-A dataset not found at {imagenet_path}, using fallback")
    #         return 50.0
        
    #     # Load ImageNet-A dataset
    #     eval_dataset = torchvision.datasets.ImageFolder(
    #         root=imagenet_path,
    #         transform=transform
    #     )
        
    #     # Use only a small subset for faster evaluation
    #     subset_size = min(200, len(eval_dataset))
    #     subset_indices = torch.randperm(len(eval_dataset))[:subset_size]
    #     eval_subset = torch.utils.data.Subset(eval_dataset, subset_indices)
        
    #     # Disable multiprocessing for evaluation to avoid lambda serialization issues
    #     eval_dataloader = DataLoader(eval_subset, batch_size=1, shuffle=False, 
    #                                num_workers=0, pin_memory=torch.cuda.is_available())
        
    #     # Get class names from folder structure
    #     class_dirs = eval_dataset.classes
    #     print(f"Found {len(class_dirs)} classes in ImageNet-A")
        
    #     # Map class directory names to ImageNet class names
    #     if IMAGENET_IMPORTS_AVAILABLE:
    #         # Load WordNet ID to class name mapping
    #         wordnet_mapping = {}
    #         wordnet_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'clip/zero_shot/WordNetId2ClassName.txt')
    #         try:
    #             with open(wordnet_file, 'r') as f:
    #                 for line in f:
    #                     parts = line.strip().split()
    #                     if len(parts) >= 3:
    #                         wordnet_id = parts[0]
    #                         class_name = ' '.join(parts[2:]).replace('_', ' ')
    #                         wordnet_mapping[wordnet_id] = class_name
    #             print(f"Loaded {len(wordnet_mapping)} WordNet ID mappings")
    #         except Exception as e:
    #             print(f"Failed to load WordNet mapping: {e}")
    #             wordnet_mapping = {}
            
    #         # Map class directories to actual class names (PRESERVING ORDER!)
    #         classnames = []
    #         class_dir_to_idx = {}  # Keep track of ImageFolder class index
    #         for idx, class_dir in enumerate(class_dirs):
    #             class_dir_to_idx[class_dir] = idx
    #             if class_dir in wordnet_mapping:
    #                 classnames.append(wordnet_mapping[class_dir])
    #                 print(f"Mapped {class_dir} (idx:{idx}) -> {wordnet_mapping[class_dir]}")
    #             else:
    #                 # Fallback to directory name
    #                 clean_name = class_dir.replace('_', ' ')
    #                 classnames.append(clean_name)
    #                 print(f"No mapping for {class_dir} (idx:{idx}), using {clean_name}")
            
    #         print(f"🔍 Class mapping verification:")
    #         print(f"   ImageFolder classes: {len(class_dirs)}")
    #         print(f"   Zero-shot classes: {len(classnames)}")
    #         print(f"   First few mappings: {list(zip(class_dirs[:3], classnames[:3]))}")
            
    #         templates = imagenet_templates
    #     else:
    #         # Fallback to simple class names
    #         classnames = [f"class_{i}" for i in range(len(class_dirs))]
    #         templates = ["a photo of a {}."]
        
    #     print(f"Using {len(classnames)} class names with {len(templates)} templates")
        
    #     # Initialize tokenizer
    #     tokenizer = SimpleTokenizer()
        
    #     # Get model for evaluation
    #     eval_model = model.module if hasattr(model, 'module') else model
    #     eval_model.eval()
        
    #     print("Computing zero-shot weights...")
    #     # Get zero-shot weights
    #     zeroshot_weights = zeroshot_classifier(eval_model, classnames, templates, tokenizer, device)
        
    #     correct = 0
    #     total = 0
        
    #     print(f"Running evaluation on {subset_size} samples...")
    #     with torch.no_grad():
    #         eval_pbar = tqdm(eval_dataloader, desc="🎯 Zero-shot Eval", 
    #                        total=len(eval_dataloader), unit="sample",
    #                        bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]')
            
    #         for i, (images, labels) in enumerate(eval_pbar):
    #             image_input = images.to(device)
    #             image_features = eval_model.encode_image(image_input)
    #             image_features /= image_features.norm(dim=-1, keepdim=True)
    #             similarity = (100.0 * image_features @ zeroshot_weights).softmax(dim=-1)
                
    #             _, predicted = similarity.max(1)
    #             total += labels.size(0)
    #             correct += predicted.eq(labels.to(device)).sum().item()
                
    #             # Update progress bar with current accuracy
    #             current_acc = 100.0 * correct / total if total > 0 else 0.0
    #             eval_pbar.set_postfix({'Acc': f'{current_acc:.1f}%'})
        
    #     accuracy = 100.0 * correct / total
    #     print(f"ImageNet-A evaluation completed: {correct}/{total} correct, accuracy: {accuracy:.2f}%")
    #     return accuracy
    
    # except Exception as e:
    #     print(f"Evaluation failed with error: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     # Return loss-based metric as fallback
    #     print("Using fallback metric value of 50.0")
    #     return 50.0  # Default fallback metric


class Dispatcher():
    def __init__(self, queue):
        self.queue = queue
    
    def emit(self, event, data):
        self.queue.put((event, data))


class KernelBase:
    def __init__(self, trial, queue):
        print("CLIP kernel init")
        self.trial = trial
        self.budget = int(trial['budget'])  # number of epochs
        self.hparams = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']
        self.queue = queue
        self.dispatcher = Dispatcher(self.queue)

    def run(self):
        np.random.seed(SEED)
        torch.manual_seed(SEED)
        
        if self.dataset == "mscoco":
            res = train_clip_mscoco(
                budget=self.budget, 
                hparams=self.hparams, 
                dispatcher=self.dispatcher
            )
        else:
            raise ValueError(f"Unsupported dataset: {self.dataset}")
        
        return res


def train_clip_mscoco(budget, hparams, dispatcher):
    """Train CLIP model on MS-COCO dataset"""
    
    # Load configuration files
    DATA_CONFIG_PATH = 'clip/dataloader/data_config.yaml'
    MODEL_CONFIG_PATH = 'clip/model/model_config.yaml'
    TRAINER_CONFIG_PATH = 'clip/trainer/train_config.yaml'
    
    data_config = load_config_file(DATA_CONFIG_PATH)
    model_config = load_config_file(MODEL_CONFIG_PATH)
    train_config = load_config_file(TRAINER_CONFIG_PATH)
    
    # Merge configs
    config = OmegaConf.merge(train_config, data_config)
    
    # Override with hyperparameters from BOHB
    config.optimizer.params.lr = hparams.get('learning_rate', 5e-4)
    config.optimizer.params.eps = hparams.get('eps', 1e-8)
    config.per_gpu_train_batch_size = hparams.get('batch_size', 64)
    config.optimizer.params.weight_decay = hparams.get('weight_decay', 0.1)
    config.optimizer.type = hparams.get('optimizer_type', 'AdamW')
    config.gradient_accumulation_steps = 1  # Fixed to 1 for simplicity
    config.num_train_epochs = budget  # Use budget as number of epochs
    
    # New hyperparameters
    config.warmup_ratio = hparams.get('warmup_ratio', 0.2)
    config.scheduler_type = hparams.get('scheduler_type', 'cosine')
    config.dropout_rate = hparams.get('dropout_rate', 0.1)
    config.temperature_init = hparams.get('temperature_init', 0.07)
    config.eval_dataset = hparams.get('eval_dataset', 'cifar-10')  # Choice of evaluation dataset
    
    # Set device
    config.device = "cuda" if torch.cuda.is_available() else "cpu"
    config.n_gpu = torch.cuda.device_count()
    
    # Initialize tokenizer
    tokenizer = SimpleTokenizer()
    
    # Create RN50 model (fixed architecture)
    model_params = dict(model_config.RN50)
    if 'vision_layers' in model_params:
        model_params['vision_layers'] = tuple(model_params['vision_layers'])
    model_params['vision_patch_size'] = model_params.get('vision_patch_size', None)
    model = CLIP(**model_params)
    
    # Move model to device
    model = model.to(torch.device(config.device))
    
    # Initialize temperature parameter if specified
    if hasattr(model, 'logit_scale'):
        # Convert temperature to log scale for logit_scale
        import math
        initial_logit_scale = math.log(1.0 / config.temperature_init)
        model.logit_scale.data.fill_(initial_logit_scale)
    
    # Create dataset and dataloader
    try:
        train_dataset = CLIP_COCO_dataset(config, tokenizer)
        config.train_batch_size = config.per_gpu_train_batch_size * max(1, config.n_gpu)
        
        # A6000 optimization: Enable multiprocessing for speed
        original_num_workers = getattr(config, 'num_workers', 4)
        # Detect A6000-class GPU for optimizations
        gpu_memory_gb = 0
        if torch.cuda.is_available():
            gpu_memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        is_high_end_gpu = (gpu_memory_gb >= 20 or config.per_gpu_train_batch_size >= 64)
        
        if is_high_end_gpu:
            config.num_workers = min(16, os.cpu_count())  # A6000 optimization
            config.pin_memory = True  # A6000: Faster GPU memory transfer
            config.persistent_workers = True  # A6000: Keep workers alive
            print(f"🚀 High-end GPU detected ({gpu_memory_gb:.1f}GB) - Using {config.num_workers} workers + optimizations")
        else:
            config.num_workers = 0  # Conservative for smaller GPUs
            config.pin_memory = False
            config.persistent_workers = False
            print(f"📱 Standard GPU ({gpu_memory_gb:.1f}GB) - Using conservative settings")
        
        train_dataloader = get_dataloader(config, train_dataset, is_train=True)
        
        # Restore original value
        config.num_workers = original_num_workers
    except Exception as e:
        print(f"Error loading dataset: {e}")
        # Return dummy results if dataset loading fails
        dispatcher.emit('error', str(e))
        return {'loss': 999.0, 'metric': 0.0}
    
    # Setup optimizer based on type
    if config.optimizer.type == 'AdamW':
        from torch.optim import AdamW
        optimizer = AdamW(
            model.parameters(), 
            lr=config.optimizer.params.lr,
            eps=config.optimizer.params.eps,
            weight_decay=config.optimizer.params.weight_decay
        )
    elif config.optimizer.type == 'Adam':
        from torch.optim import Adam
        optimizer = Adam(
            model.parameters(),
            lr=config.optimizer.params.lr,
            eps=config.optimizer.params.eps,
            weight_decay=config.optimizer.params.weight_decay
        )
    elif config.optimizer.type == 'SGD':
        from torch.optim import SGD
        optimizer = SGD(
            model.parameters(),
            lr=config.optimizer.params.lr,
            weight_decay=config.optimizer.params.weight_decay,
            momentum=0.9  # Standard momentum for SGD
        )
    elif config.optimizer.type == 'RMSprop':
        from torch.optim import RMSprop
        optimizer = RMSprop(
            model.parameters(),
            lr=config.optimizer.params.lr,
            eps=config.optimizer.params.eps,
            weight_decay=config.optimizer.params.weight_decay,
            alpha=0.99  # Standard alpha for RMSprop
        )
    elif config.optimizer.type == 'Adagrad':
        from torch.optim import Adagrad
        optimizer = Adagrad(
            model.parameters(),
            lr=config.optimizer.params.lr,
            eps=config.optimizer.params.eps,
            weight_decay=config.optimizer.params.weight_decay
        )
    else:
        raise ValueError(f"Unknown optimizer type: {config.optimizer.type}")
    
    # Calculate total training steps
    t_total = len(train_dataloader) // config.gradient_accumulation_steps * config.num_train_epochs
    
    # Setup scheduler based on type
    num_warmup_steps = int(config.warmup_ratio * t_total)
    
    if config.scheduler_type == 'cosine':
        from utils.custom_schedulers import get_cosine_schedule_with_warmup
        scheduler = get_cosine_schedule_with_warmup(
            optimizer, 
            num_warmup_steps=num_warmup_steps,
            num_training_steps=t_total
        )
    elif config.scheduler_type == 'cosine_restarts':
        from utils.custom_schedulers import get_cosine_with_hard_restarts_schedule_with_warmup
        scheduler = get_cosine_with_hard_restarts_schedule_with_warmup(
            optimizer,
            num_warmup_steps=num_warmup_steps,
            num_training_steps=t_total,
            num_cycles=2
        )
    elif config.scheduler_type == 'linear':
        from torch.optim.lr_scheduler import LinearLR
        scheduler = LinearLR(optimizer, start_factor=0.1, total_iters=t_total)
    elif config.scheduler_type == 'none':
        scheduler = None
    else:
        # Default to cosine
        from utils.custom_schedulers import get_cosine_schedule_with_warmup
        scheduler = get_cosine_schedule_with_warmup(
            optimizer, 
            num_warmup_steps=num_warmup_steps,
            num_training_steps=t_total
        )
    
    # Multi-GPU support
    if config.n_gpu > 1:
        model = torch.nn.DataParallel(model)
    
    # A6000 optimization: Mixed Precision Training
    # More aggressive AMP detection: enable for smaller batches too
    use_amp = (config.per_gpu_train_batch_size >= 32 and torch.cuda.is_available())
    if use_amp:
        print(f"⚡ Enabling Mixed Precision (AMP) for speed boost (batch_size={config.per_gpu_train_batch_size})")
        scaler = torch.cuda.amp.GradScaler()
        # A6000 optimization: More aggressive scaler settings
        print(f"🚀 AMP optimizations: faster convergence + memory efficiency")
    else:
        scaler = None
    
    # Training loop
    model.train()
    global_step = 0
    total_loss = 0.0
    best_loss = float('inf')
    
    # Signal training start
    dispatcher.emit('start', None)
    dispatcher.emit('progress', {'current': 0, 'total': budget})
    
    # Epoch progress bar with time estimation
    epoch_pbar = tqdm(range(budget), desc="🚀 Training Progress", 
                      unit="epoch", position=0, leave=True,
                      bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} epochs [{elapsed}<{remaining}, {rate_fmt}]')
    
    import time
    training_start_time = time.time()
    
    for epoch in epoch_pbar:
        epoch_start_time = time.time()
        epoch_loss = 0.0
        num_batches = 0
        
        # Step progress bar for current epoch
        step_pbar = tqdm(enumerate(train_dataloader), 
                        desc=f"📊 Epoch {epoch+1}/{budget}", 
                        total=len(train_dataloader),
                        unit="step", position=1, leave=False,
                        bar_format='{desc}: {percentage:3.0f}%|{bar}| {n_fmt}/{total_fmt} steps [{elapsed}<{remaining}, {rate_fmt}]')
        
        for step, batch in step_pbar:
            input_images, input_texts = batch
            input_images = input_images.to(torch.device(config.device))
            input_texts = input_texts.to(torch.device(config.device))
            
            # A6000 optimization: Mixed Precision Forward Pass
            if use_amp:
                with torch.cuda.amp.autocast():
                    # Forward pass with mixed precision
                    image_features, text_features = model(input_images, input_texts)
                    
                    # Normalize features
                    image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                    text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                    
                    # Get logit scale
                    if config.n_gpu == 1:
                        logit_scale = model.logit_scale.exp()
                    else:
                        logit_scale = model.module.logit_scale.exp()
                    
                    # Calculate similarity logits
                    logits_per_image = logit_scale * image_features @ text_features.t()
                    logits_per_text = logit_scale * text_features @ image_features.t()
                    
                    # Labels are diagonal (i-th image matches i-th text)
                    labels = torch.arange(len(logits_per_image)).to(logits_per_image.device)
                    
                    # Calculate losses
                    image_loss = F.cross_entropy(logits_per_image, labels)
                    text_loss = F.cross_entropy(logits_per_text, labels)
                    loss = (image_loss + text_loss) / 2
                    
                    if config.n_gpu > 1:
                        loss = loss.mean()
                    
                    if config.gradient_accumulation_steps > 1:
                        loss = loss / config.gradient_accumulation_steps
                
                # Backward pass with mixed precision
                scaler.scale(loss).backward()
            else:
                # Standard forward pass (for smaller GPUs)
                image_features, text_features = model(input_images, input_texts)
                
                # Normalize features
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                
                # Get logit scale
                if config.n_gpu == 1:
                    logit_scale = model.logit_scale.exp()
                else:
                    logit_scale = model.module.logit_scale.exp()
                
                # Calculate similarity logits
                logits_per_image = logit_scale * image_features @ text_features.t()
                logits_per_text = logit_scale * text_features @ image_features.t()
                
                # Labels are diagonal (i-th image matches i-th text)
                labels = torch.arange(len(logits_per_image)).to(logits_per_image.device)
                
                # Calculate losses
                image_loss = F.cross_entropy(logits_per_image, labels)
                text_loss = F.cross_entropy(logits_per_text, labels)
                loss = (image_loss + text_loss) / 2
                
                if config.n_gpu > 1:
                    loss = loss.mean()
                
                if config.gradient_accumulation_steps > 1:
                    loss = loss / config.gradient_accumulation_steps
                
                # Standard backward pass
                loss.backward()
            
            epoch_loss += loss.item()
            total_loss += loss.item()
            num_batches += 1
            
            # Update step progress bar with current loss
            current_avg_loss = epoch_loss / num_batches
            step_pbar.set_postfix({
                'Loss': f'{current_avg_loss:.4f}',
                'LR': f'{optimizer.param_groups[0]["lr"]:.2e}',
                'Step': f'{global_step}'
            })
            
            # A6000 optimization: Mixed Precision Optimizer Step
            if (step + 1) % config.gradient_accumulation_steps == 0:
                global_step += 1
                
                # Gradient clipping to prevent NaN
                if use_amp:
                    # Mixed precision with gradient clipping
                    scaler.unscale_(optimizer)
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    # Standard optimizer step with gradient clipping
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    optimizer.step()
                
                # Clamp logit scale
                if config.n_gpu == 1:
                    model.logit_scale.data = torch.clamp(model.logit_scale.data, 0, 4.6052)
                else:
                    model.module.logit_scale.data = torch.clamp(model.module.logit_scale.data, 0, 4.6052)
                
                if scheduler:
                    scheduler.step()
                
                model.zero_grad()
            
            # Early stopping for quick testing (remove in production)
            # if step >= 10:  # Limit steps per epoch for faster iteration
            #     break
        
        # Close step progress bar
        step_pbar.close()
        
        # Calculate epoch metrics
        avg_epoch_loss = epoch_loss / num_batches if num_batches > 0 else epoch_loss
        epoch_duration = time.time() - epoch_start_time
        
        # Run zero-shot evaluation every epoch (for testing purposes)
        print(f"\n🔍 Running zero-shot evaluation for epoch {epoch + 1}...")
        metric = evaluate_zero_shot(model, config)
        
        # Calculate time estimates
        total_elapsed = time.time() - training_start_time
        avg_epoch_time = total_elapsed / (epoch + 1)
        remaining_epochs = budget - (epoch + 1)
        estimated_remaining = remaining_epochs * avg_epoch_time
        
        # Update epoch progress bar with comprehensive info
        epoch_pbar.set_postfix({
            'Loss': f'{avg_epoch_loss:.4f}',
            'Acc': f'{metric:.1f}%',
            'ETA': f'{estimated_remaining/60:.1f}min'
        })
        
        print(f"✅ Epoch {epoch + 1}/{budget} completed:")
        print(f"   🔻 Training Loss: {avg_epoch_loss:.4f}")
        print(f"   🎯 COCO Retrieval Score: {metric:.2f}%")
        print(f"   ⏱️  Epoch Time: {epoch_duration:.1f}s")
        print(f"   🕐 Est. Remaining: {estimated_remaining/60:.1f} minutes")
        print("-" * 60)

        
        # Update best loss
        if avg_epoch_loss < best_loss:
            best_loss = avg_epoch_loss
        
        # Report progress
        dispatcher.emit('progress', {'current': epoch + 1, 'total': budget})
    
    # Close epoch progress bar
    epoch_pbar.close()
    
    # Calculate final metrics using zero-shot evaluation
    final_loss = total_loss / (global_step if global_step > 0 else 1)
    print("🎯 Training completed! Running final comprehensive evaluation...")
    final_metric = evaluate_zero_shot(model, config)  # Use zero-shot evaluation for final metric
    
    print("=" * 80)
    print("🏁 FINAL TRAINING RESULTS")
    print("=" * 80)
    print(f"📊 Total Epochs: {budget}")
    print(f"🔻 Final Training Loss: {final_loss:.4f}")
    print(f"🎯 Final COCO Retrieval Score: {final_metric:.2f}%")
    print(f"⚡ Total Training Steps: {global_step}")
    print("=" * 80)
    
    # Clean up DataLoader to prevent multiprocessing issues
    if hasattr(train_dataloader, '_iterator') and train_dataloader._iterator is not None:
        try:
            train_dataloader._iterator._shutdown_workers()
        except:
            pass
    
        # Signal training end
        dispatcher.emit('done', {'loss': final_loss, 'metric': final_metric})
        
        return {'loss': final_loss, 'metric': final_metric}
    
    except Exception as e:
        print(f"Error during CLIP training: {str(e)}")
        # Emit error for notification system
        if dispatcher:
            dispatcher.emit('error', str(e))
        # Return dummy results to keep BOHB algorithm working
        return {'loss': 999.0, 'metric': 0.0}