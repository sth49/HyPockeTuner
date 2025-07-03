import segmentation_models_pytorch as smp
import torch
from kernels.training import losses, metrics, optimizers, callbacks

def get_model(architecture, init_params):
    model_class = smp.__dict__[architecture]
    return model_class(**init_params)

def get_smp_loss(name, init_params):
    init_params = init_params or {}
    loss_class = smp.losses.__dict__[name]
    return loss_class(**init_params)


def get_loss(name, init_params):
    
    if name == "jaccard":
        name = "JaccardLoss"
    elif name == "dice":
        name = "DiceLoss"
    elif name == "l1":
        name = "L1Loss"
    elif name == "mse":
        name = "MSELoss"
    elif name == "bce":
        name = "BCELoss"
    elif name == "binary_focal":
        name = "BinaryFocalLoss"
    elif name == "focal_dice":
        name = "FocalDiceLoss"
    elif name == "bce_dice":
        name = "BCEDiceLoss"
    init_params = init_params or {}
    loss_class = losses.__dict__[name]
    return loss_class(**init_params)

def get_metric(name, init_params):
    init_params = init_params or {}
    metric_class = metrics.__dict__[name]
    return metric_class(**init_params)


def get_optimizer(name, model_params, init_params):
    assert init_params is not None
    if name == "adadelta":
        optimizer = torch.optim.Adadelta(model_params,
                                        weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'adam':
        optimizer = torch.optim.Adam(model_params,
                                     weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'adamw':
        optimizer = torch.optim.AdamW(model_params,
                                      weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'adamax':
        optimizer = torch.optim.Adamax(model_params,
                                      weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'asgd':
        optimizer = torch.optim.ASGD(model_params,
                                    weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'rprop':
        optimizer = torch.optim.Rprop(model_params, lr=init_params["learning_rate"])
    elif name == "nadam":
        optimizer = torch.optim.NAdam(model_params,
                                      weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == "radam":
        optimizer = torch.optim.RAdam(model_params,
                                     weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"])
    elif name == 'sgd':
        optimizer = torch.optim.SGD(model_params,
                                    weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"],momentum=init_params["momentum"])
    elif name == 'rms':
        optimizer = torch.optim.RMSprop(model_params,
                                        weight_decay=init_params["weight_decay"], lr=init_params["learning_rate"],momentum=init_params["momentum"])
    else:
        raise NotImplementedError
    
    # optim_class = optimizers.__dict__[name]
    # return optim_class(model_params, **init_params)

    return optimizer

def get_scheduler(name, optimizer, init_params):
    # init_params = init_params or {}
    # scheduler_class = optimizers.__dict__[name]
    # scheduler = scheduler_class(optimizer, **init_params)
    if name == "multipli":
        lmbda = lambda epoch: 0.95
        scheduler = torch.optim.lr_scheduler.MultiplicativeLR(optimizer, lr_lambda=lmbda)
    elif name == "step":
        step_size = init_params["epoch"] / 3
        scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=step_size)
    elif name == "constant":
        scheduler = torch.optim.lr_scheduler.ConstantLR(optimizer)
    elif name == "linear":
        scheduler = torch.optim.lr_scheduler.LinearLR(optimizer)
    elif name == "exp":
        gamma = 0.95
        scheduler = torch.optim.lr_scheduler.ExponentialLR(optimizer, gamma)
    elif name == "poly":
        scheduler = torch.optim.lr_scheduler.PolynomialLR(optimizer, power=2)
    elif name == "cosine":
        T_max = init_params["epoch"] / 2
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max)
    elif name == "reduce":
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer)
    elif name == "none":
        scheduler = None
    else:
        raise NotImplementedError
    return scheduler




def get_callback(name, init_pararams):
    init_pararams = init_pararams or {}
    callback_class = callbacks.__dict__[name]
    callback = callback_class(**init_pararams)
    return callback