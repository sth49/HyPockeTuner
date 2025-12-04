from .kernel import KernelBase

def get_kernel_for_trial(trial):
    """Select appropriate kernel based on trial configuration."""
    return 'kernel'

def load_kernel(kernel_name):
    """Load the kernel class."""
    return KernelBase
