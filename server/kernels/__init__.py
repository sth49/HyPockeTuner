# Dynamic kernel selection based on model and dataset
def get_kernel_for_trial(trial):
    """
    Select appropriate kernel based on model and dataset combination
    """
    model = trial.get('model', '')
    dataset = trial.get('dataset', '')
    
    # Define model-dataset to kernel mapping
    kernel_mapping = {
        ('clip', 'mscoco'): 'clip_kernel',
        ('cnn', 'mnist'): 'segmentation_kernel2',
        ('unet', 'satellite'): 'segmentation_kernel2',
        ('bert', 'K-MHaS'): 'nlp_kernel',  # Use NLP kernel for BERT + Korean hate speech
        ('bert-multilingual', 'K-MHaS'): 'nlp_kernel',  # Add multilingual BERT support
    }
    
    # Find matching kernel
    kernel_name = kernel_mapping.get((model, dataset))
    
    if kernel_name:
        return kernel_name
    else:
        # Default fallback - try to determine from model or dataset
        if model == 'clip':
            return 'clip_kernel'
        else:
            return 'segmentation_kernel2'

def load_kernel(kernel_name):
    """Dynamically import the specified kernel"""
    if kernel_name == 'clip_kernel':
        from .clip_kernel import KernelBase
        return KernelBase
    elif kernel_name == 'nlp_kernel':
        from .nlp_kernel import KernelBase
        return KernelBase
    else:  # Default to segmentation_kernel2
        from .segmentation_kernel2 import KernelBase
        return KernelBase

# For backward compatibility, still support environment variable
import os
env_kernel_type = os.environ.get('KERNEL_TYPE')
if env_kernel_type == 'clip':
    from .clip_kernel import *
else:
    from .segmentation_kernel2 import *