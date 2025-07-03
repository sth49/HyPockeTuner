import torch
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import torch.backends.cudnn as cudnn
from models import *
import torchvision
import torchvision.transforms as transforms
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import requests
import os
import hashlib
import tempfile
import gzip
import dataclasses
import json
import logging
import os
import sys
from pathlib import Path

import pandas as pd
import simple_parsing
import torch
from torch.utils.data import DataLoader

import training
# import wandb
from common import getters
from common.argparse import TrainingArguments
from common.utils import (increment_path, random_split, rle_encode,
                          seed_everything)
from dataset import transform
from dataset.dataset import SatelliteDataset
from model.unet import UNet
from training.trainer import Trainer



SEED = 123
use_cuda = torch.cuda.is_available()
device = torch.device("cuda" if use_cuda else "cpu")

class KernelBase:
    def __init__(self, trial):
        self.trial = trial
        self.budget = int(trial['budget'])
        self.params = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']

    def run(self):
        np.random.seed(SEED)
        if self.dataset=="mnist" and self.model=="cnn":
            x_train, y_train, x_test, y_test = fetch_mnist()
            # print(self.)
            res = train_mnist(**self.params, x_train=x_train, y_train=y_train,
                           x_test=x_test, y_test=y_test, n_epochs=self.budget)
        if self.dataset=="satellite":
            # print("train_satellite", self.trial)
            res = train_satellite(self.trial)
            # print("output of ", res)
        # else:
        #     loss = train(**self.params, n_epochs=self.budget, model=self.model, dataset=self.dataset)

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
    
    
# def fetch_cifar10(batch_size):    
#     # https://github.com/kuangliu/pytorch-cifar/blob/master/main.py
#     transform_train = transforms.Compose([
#         transforms.RandomCrop(32, padding=4),
#         transforms.RandomHorizontalFlip(),
#         transforms.ToTensor(),
#         transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
#     ])

#     transform_test = transforms.Compose([
#         transforms.ToTensor(),
#         transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
#     ])

#     trainset = torchvision.datasets.CIFAR10(
#         root='../data', train=True, download=True, transform=transform_train)
#     trainloader = torch.utils.data.DataLoader(
#         trainset, batch_size=batch_size, shuffle=True, num_workers=4)

#     testset = torchvision.datasets.CIFAR10(
#         root='../data', train=False, download=True, transform=transform_test)
#     testloader = torch.utils.data.DataLoader(
#         testset, batch_size=batch_size, shuffle=False, num_workers=4)
    
#     return trainloader, testloader

# https://github.com/geohot/tinygrad/blob/master/extra/utils.py
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
    
    # x_train = torch.from_numpy(x_train.copy()).cpu().float()
    # y_train = torch.from_numpy(y_train.copy()).cpu().long()
    # x_test = torch.from_numpy(x_test.copy()).cpu().float()
    # y_test = torch.from_numpy(y_test.copy()).cpu().long()
    # model = MNIST(hidden_size, activation)
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
    

# def train(batch_size, optimizer,  scheduler_p,
#                  learning_rate, weight_decay, momentum, n_epochs, model, dataset, hidden_size=None, activation=None):
    
#     torch.manual_seed(SEED)
    
#     if (dataset=="cifar10"):
#         trainloader, testloader = fetch_cifar10(batch_size)
#     else:
#         raise NotImplementedError
#     print(model)
        
#     if model == "VGG19":
#         model = VGG(model)
#     elif (model == "ResNet18"):
#         model = ResNet18()
#     else :
#         raise NotImplementedError
    
#     model = model.to(device)
        
#     if optimizer == 'adam':
#         optimizer = torch.optim.Adam(model.parameters(),
#                                      weight_decay=weight_decay, lr=learning_rate)
#     elif optimizer == 'sgd':
#         optimizer = torch.optim.SGD(model.parameters(),
#                                     weight_decay=weight_decay, lr=learning_rate,
#                                     momentum=momentum)
#     elif optimizer == 'rms':
#         optimizer = torch.optim.RMSprop(model.parameters(),
#                                         weight_decay=weight_decay, lr=learning_rate,
#                                         momentum=momentum)
#     else:
#         raise NotImplementedError
    
#     scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
#         optimizer, T_max=n_epochs)

#     loss_fn = torch.nn.CrossEntropyLoss()
    
    
#     for epoch in range(int(n_epochs)):
#         train_loss = 0
#         correct = 0
#         total = 0
#         model.train()
#         for batch_idx, (inputs, targets) in enumerate(trainloader):
#             inputs, targets = inputs.to(device), targets.to(device)
#             optimizer.zero_grad()
#             output = model(inputs)
#             loss = loss_fn(output, targets)
#             loss.backward()
#             optimizer.step()
#             train_loss += loss.item()
#             _, predicted = output.max(1)
#             total += targets.size(0)
#             correct += predicted.eq(targets).sum().item()
#         model.eval()
#         test_loss = 0
#         correct = 0
#         total = 0
#         with torch.no_grad():
#             for batch_idx, (inputs, targets) in enumerate(testloader):
#                 inputs, targets = inputs.to(device), targets.to(device)
#                 output = model(inputs)
#                 loss = loss_fn(output, targets)
#                 test_loss += loss.item()
#                 _, predicted = output.max(1)
#                 total += targets.size(0)
#                 correct += predicted.eq(targets).sum().item()
#         if scheduler_p:
#             scheduler.step()
#     loss = test_loss / batch_idx+1
#     acc = correct / total
#     print("loss", loss)
#     print("acc", acc)
#     return {"loss": loss, "acc": acc}
    
def worker_init_fn(seed):
    import random
    import time

    import numpy as np
    seed = (seed + 1) * (int(time.time()) % 60)  # set random seed every epoch!
    random.seed(seed + 1)
    np.random.seed(seed)

def train_satellite(trial):
    params = trial['params']
    params['epoch'] = trial['budget']
    if params['pretrained'] == True:
        params['pretrained'] = "imagenet"

    if params['activation'] == "none":
        params['activation'] = None
    if (params['encoder'] == "resnet"):
        params['encoder_name'] = "resnet34"
    elif (params['encoder'] == "vgg"):
        params['encoder_name'] = "vgg19"
    elif (params['encoder'] == "densenet"):
        params['encoder_name'] = "densenet201"
    elif (params['encoder'] == "xception"):
        params['encoder_name'] = "xception"
    elif (params['encoder'] == "dpn"):
        params['encoder_name'] = "dpn68"
    elif (params['encoder'] == "efficientnet"):
        params['encoder_name'] = "efficientnet-b3"
    elif (params['encoder'] == "mobilenet"):
        params['encoder_name'] = "mobilenet_v2"
    
    init_params = {
        "encoder_name": params['encoder'],
        "encoder_weights": params['pretrained'],
        "classes": 1,
        "activation": params["activation"]
    }
    if params['encoder'] == "none":
        model = UNet()
    else:
        model = getters.get_model(architecture="Unet", init_params=init_params)
    model_params = model.parameters()

    train_dataset = SatelliteDataset(
        data_dir="./data/satellite", 
        csv_file="train_edited.csv", 
        transform=getattr(transform, "train_transform_2"),
    )

    # print("params['batch_size']", params)
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
    metrics[trial["metric"]] = getters.get_metric(trial["metric"], init_params=None)

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
    

    trainer = Trainer(
        model=model, model_device=device,
    )
    trainer.compile(optimizer=optimizer, loss=losses, metrics=metrics)
    result = trainer.train(
            train_dataloader=train_dataloader,
            valid_dataloader=val_dataloader,
            epochs=trial['budget'],
            accumulation_steps=4,
            verbose=True,
            scheduler=scheduler,
    )
    # print("result", result)
    
    return result
                                          


    
    
if __name__ == "__main__":
    trial  = dict({
        "budget": 1,
        "params": {
            "learning_rate": 0.001,
            "optimizer": "sgd",
            "scheduler": "step",
            "batch_size": 128,
            "weight_decay": 0.0005,
            "momentum": 0.9,
            "activation": "none",
            "loss": "DiceLoss",
            "encoder": "efficientnet-b4",
        "pretrained": True,
        },
        "metric": "DiceScore",
        "model": "Unet",
        "dataset": "satellite"
    })

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

    # 안되는 것 - "adagrad", lbfgs
    # 안되는 것  - "lambda", "multi_step", "step",

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
    