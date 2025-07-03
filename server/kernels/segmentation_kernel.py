import torch
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import torch.backends.cudnn as cudnn
import torchvision
import torchvision.transforms as transforms
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import requests
import os
import hashlib
import tempfile
import gzip
import os
from pathlib import Path

import pandas as pd
import torch
from torch.utils.data import DataLoader

# import training
# import wandb
from kernels.common import getters
from kernels.dataset import transform
from kernels.dataset.dataset import SatelliteDataset
from kernels.model.unet import UNet
from kernels.training.trainer import Trainer



SEED = 123
use_cuda = torch.cuda.is_available()
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

class KernelBase:
    def __init__(self, trial):
        print("segmentation kernel init")
        self.trial = trial
        self.budget = int(trial['budget'])
        self.params = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']

    def run(self):
        np.random.seed(SEED)
        if self.dataset=="CIFAR10" or self.dataset=="mnist":
            x_train, y_train, x_test, y_test = fetch_mnist()
            res = train_mnist(**self.params, x_train=x_train, y_train=y_train,
                           x_test=x_test, y_test=y_test, n_epochs=self.budget)
        if self.dataset=="mnist":
            x_train, y_train, x_test, y_test = fetch_mnist()
            res = train_mnist(**self.params, x_train=x_train, y_train=y_train,
                           x_test=x_test, y_test=y_test, n_epochs=self.budget)
        if self.dataset=="satellite":
            res = train_satellite(self.trial)

        return res
    
class MNIST(torch.nn.Module):
    def __init__(self, hidden_size, activation):
        super().__init__()
        self.l1 = torch.nn.Linear(784, hidden_size)
        self.l2 = torch.nn.Linear(hidden_size, hidden_size)
        if activation == 'relu':
            self.a = torch.nn.functional.relu
        elif activation == 'tanh':
            self.a = torch.tanh
        elif activation == 'lrelu':
            self.a = torch.nn.functional.leaky_relu
        else:
            raise NotImplementedError
        self.output = torch.nn.Linear(hidden_size, 10)

    def forward(self, x):
        return self.output(self.a(self.l2(self.a(self.l1(x)))))
    
    

def fetch(url):
    fp = os.path.join(tempfile.gettempdir(),
                      hashlib.md5(url.encode('utf-8')).hexdigest())
    if os.path.isfile(fp) and os.stat(fp).st_size > 0:
        with open(fp, "rb") as f:
            dat = f.read()
    else:
        print("fetching %s" % url)
        dat = requests.get(url).content
        with open(fp+".tmp", "wb") as f:
            f.write(dat)
        os.rename(fp+".tmp", fp)
    return dat


def fetch_from_local(path):
    # 파일 경로가 유효한지 확인
    if os.path.isfile(path) and os.stat(path).st_size > 0:
        with open(path, "rb") as f:
            data = f.read()
            return data
    else:
        # 파일이 없거나 크기가 0인 경우 오류 메시지 출력
        raise FileNotFoundError(f"File not found or is empty at {path}")



def parse_mnist(data):
    return np.frombuffer(gzip.decompress(data), dtype=np.uint8).copy()

def fetch_mnist():
    # X = parse_mnist(
    #     fetch("http://yann.lecun.com/exdb/mnist/train-images-idx3-ubyte.gz")
    # )[0x10:].reshape((-1, 28, 28))
    # Y = parse_mnist(fetch(
    #     "http://yann.lecun.com/exdb/mnist/train-labels-idx1-ubyte.gz"))[8:]
    X = parse_mnist(
        fetch_from_local("./data/MNIST/raw/train-images-idx3-ubyte.gz")
    )[0x10:].reshape((-1, 28, 28))
    Y = parse_mnist(fetch_from_local(
        "./data/MNIST/raw/train-labels-idx1-ubyte.gz"))[8:]
    idx = np.arange(0, 2048+128)
    np.random.shuffle(idx)
    X_train = X[idx[:2048]].reshape(-1, 28*28)
    Y_train = Y[idx[:2048]]
    X_test = X[idx[2048:]].reshape(-1, 28*28)
    Y_test = Y[idx[2048:]]
    return X_train, Y_train, X_test, Y_test
    
def train_mnist(batch_size, n_epochs, optimizer, hidden_size, scheduler_p,
                activation, learning_rate, weight_decay, momentum,
                x_train, y_train, x_test, y_test):
    
    torch.manual_seed(SEED)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device", device  )
    x_train = torch.from_numpy(x_train.copy()).to(device).float()
    y_train = torch.from_numpy(y_train.copy()).to(device).long()
    x_test = torch.from_numpy(x_test.copy()).to(device).float()
    y_test = torch.from_numpy(y_test.copy()).to(device).long()
    model = MNIST(hidden_size, activation).to(device)

    if optimizer == 'adam':
        optimizer = torch.optim.Adam(model.parameters(),
                                     weight_decay=weight_decay, lr=learning_rate)
    elif optimizer == 'sgd':
        optimizer = torch.optim.SGD(model.parameters(),
                                    weight_decay=weight_decay, lr=learning_rate,
                                    momentum=momentum)
    elif optimizer == 'rms':
        optimizer = torch.optim.RMSprop(model.parameters(),
                                        weight_decay=weight_decay, lr=learning_rate,
                                        momentum=momentum)
    else:
        raise NotImplementedError

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=n_epochs)

    loss_fn = torch.nn.CrossEntropyLoss()

    for epoch in range(int(n_epochs)):
        for batch_idx in range(len(x_train) // batch_size):
            batch = x_train[
                batch_idx * batch_size:(batch_idx + 1) * batch_size]
            output = model(batch)
            loss = loss_fn(output, y_train[
                batch_idx * batch_size:(batch_idx + 1) * batch_size])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
        output = model(x_test)
        loss = loss_fn(output, y_test)
        acc = (output.argmax(axis=1) == y_test).float().sum()/y_test.shape[0]
        if scheduler_p:
            scheduler.step()
    return {"loss": loss.item(), "metric": acc.item()}
    

def worker_init_fn(seed):
    import random
    import time

    import numpy as np
    seed = (seed + 1) * (int(time.time()) % 60)  # set random seed every epoch!
    random.seed(seed + 1)
    np.random.seed(seed)

def train_satellite(trial):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device", device)
    # print("device", device)
    # print("Train start")
    # print("Train start", trial)
    params = trial['params']
    params['epoch'] = trial['budget']
    # print("params start", params)

    if params['pretrained'] == True:
        params['pretrained'] = "imagenet"
    else:
        params['pretrained'] = None
    if params['activation'] == "none":
        params['activation'] = None
    if (params['encoder'] == "resnet"):
        params['encoder'] = "resnet34"
    elif (params['encoder'] == "vgg"):
        params['encoder'] = "vgg19"
    elif (params['encoder'] == "densenet"):
        params['encoder'] = "densenet201"
    elif (params['encoder'] == "xception"):
        params['encoder'] = "xception"
    elif (params['encoder'] == "dpn"):
        params['encoder'] = "dpn68"
    elif (params['encoder'] == "efficientnet"):
        params['encoder'] = "efficientnet-b3"
    elif (params['encoder'] == "mobilenet"):
        params['encoder'] = "mobilenet_v2"
    
    init_params = {
        "encoder_name": params['encoder'],
        "encoder_weights": params['pretrained'],
        "classes": 1,
        "activation": params["activation"]
    }
    # print("Model load start2")
    if params['encoder'] == "none":
        model = UNet()
    else:
        model = getters.get_model(architecture="Unet", init_params=init_params)
    model_params = model.parameters()
    # print("Dataset load start2")
    train_dataset = SatelliteDataset(
        data_dir="./data/satellite", 
        csv_file="train_edited.csv", 
        transform=getattr(transform, "train_transform_2"),
    )

    train_dataloader = DataLoader(
        train_dataset, 
        batch_size=params['batch_size'], 
        shuffle=True, 
        num_workers=4, 
        worker_init_fn=worker_init_fn
    )

    val_dataset = SatelliteDataset(
            data_dir="./data/satellite", 
            csv_file="train_edited.csv", 
            transform=getattr(transform, "test_transform_1"), 
            val=True
    )
    val_dataloader = DataLoader(
        val_dataset, 
        batch_size=params['batch_size'], 
        shuffle=False, 
        num_workers=4,
    )
    losses = {}
    losses[params["loss_function"]] = getters.get_loss(params["loss_function"], init_params=None)

    metrics = {}
    metrics["DiceScore"] = getters.get_metric("DiceScore", init_params=None)

    optimizer = getters.get_optimizer(params["optimizer"], model_params, params)

    if params['scheduler'] == "PolyLR":
            init_params = {"epochs":params["budget"]}
    else:
        init_params = None
    
    scheduler = getters.get_scheduler(
        params['scheduler'],
        optimizer,
        init_params=params,
    )
    

    # print("Trainer start")
    # device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    trainer = Trainer(
        model=model, model_device=device,
    )
    trainer.compile(optimizer=optimizer, loss=losses, metrics=metrics)
    # print("Trainer train")
    result = trainer.train(
        train_dataloader=train_dataloader,
        valid_dataloader=val_dataloader,
        epochs=trial['budget'],
        accumulation_steps=4,
        verbose=True,
        scheduler=scheduler,
    )
    
    return result
                                          


    
    
if __name__ == "__main__":
    # trial  = dict({
    #     "budget": 1,
    #     "params": {
    #         "learning_rate": 0.001,
    #         "optimizer": "sgd",
    #         "scheduler": "step",
    #         "batch_size": 128,
    #         "weight_decay": 0.0005,
    #         "momentum": 0.9,
    #         "activation": "none",
    #         "loss": "DiceLoss",
    #         "encoder": "efficientnet-b4",
    #     "pretrained": True,
    #     },
    #     "metric": "DiceScore",
    #     "model": "Unet",
    #     "dataset": "satellite"
    # })

    losses = [
    "JaccardLoss", 
            "DiceLoss", 
            "L1Loss", 
            "BCELoss", 
            "BinaryFocalLoss", 
            "FocalDiceLoss", 
            "BCEDiceLoss",
            "MSELoss",
            ]
    
    for loss in losses:
        print("losses", loss)
        trial['params']['loss'] = loss
        kernel = KernelBase(trial)
        ret = kernel.run()
        print("======================")


    # optimizers = ["radam"]

    # schedulers = [
    #     #   "multiplicative",
    #       "step",
    #     #   "constant",
    #     #   "linear",
    #     #   "exponential",
    #     #   "polynomial",
    #       "cosine",
    #     #   "reduce",
    #     #   "none"
    #     ]
    # losses = [
    #     # "JaccardLoss", 
    #         #   "DiceLoss", 
    #         #   "L1Loss", 
    #         #   "BCELoss", 
    #         #   "BinaryFocalLoss", 
    #         #   "FocalDiceLoss", 
    #         #   "BCEDiceLoss",
    #           "MSELoss",
    #           ]
    