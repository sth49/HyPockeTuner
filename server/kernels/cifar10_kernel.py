
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

import os
import argparse

SEED = 123
use_cuda = torch.cuda.is_available()
device = torch.device("cuda" if use_cuda else "cpu")

class KernelBase:
    def __init__(self, trial):
        self.trial = trial
        self.budget = trial['budget']
        self.params = trial['params']

    def run(self):
        raise 'run(): Not Implemented!'



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

class MNISTKernel(KernelBase):
    def run(self, params, budget):
        np.random.seed(SEED)
    
        loss = train_cifar10(**params, n_epochs=budget)

        return loss

# def fetch_cifar10():
    
    
def train_cifar10(batch_size, n_epochs, optimizer, hidden_size, scheduler_p,
                activation, learning_rate, weight_decay, momentum):
    
    torch.manual_seed(SEED)
    print('==> Preparing data..')
    transform_train = transforms.Compose([
        transforms.RandomCrop(32, padding=4),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
    ])

    transform_test = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
    ])

    trainset = torchvision.datasets.CIFAR10(
        root='./data', train=True, download=True, transform=transform_train)
    trainloader = torch.utils.data.DataLoader(
        trainset, batch_size=batch_size, shuffle=True, num_workers=2)

    testset = torchvision.datasets.CIFAR10(
        root='./data', train=False, download=True, transform=transform_test)
    testloader = torch.utils.data.DataLoader(
        testset, batch_size=batch_size, shuffle=False, num_workers=2)

    classes = ('plane', 'car', 'bird', 'cat', 'deer',
            'dog', 'frog', 'horse', 'ship', 'truck')
    
    
    # x_train = torch.from_numpy(x_train.copy()).cpu().float()
    # y_train = torch.from_numpy(y_train.copy()).cpu().long()
    # x_test = torch.from_numpy(x_test.copy()).cpu().float()
    # y_test = torch.from_numpy(y_test.copy()).cpu().long()
    # model = MNIST(hidden_size, activation)
    print("device", device  )
    # x_train = torch.from_numpy(x_train.copy()).to(device).float()
    # y_train = torch.from_numpy(y_train.copy()).to(device).long()
    # x_test = torch.from_numpy(x_test.copy()).to(device).float()
    # y_test = torch.from_numpy(y_test.copy()).to(device).long()
    # model = MNIST(hidden_size, activation).to(device)
    model = VGG('VGG11').to(device)

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
        # train
        train_loss = 0
        correct = 0
        total = 0
        model.train()
        for batch_idx, (inputs, targets) in enumerate(trainloader):
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            output = model(inputs)
            loss = loss_fn(output, targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            _, predicted = output.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
        # test
        model.eval()
        test_loss = 0
        correct = 0
        total = 0
        with torch.no_grad():
            for batch_idx, (inputs, targets) in enumerate(testloader):
                inputs, targets = inputs.to(device), targets.to(device)
                output = model(inputs)
                loss = loss_fn(output, targets)
                test_loss += loss.item()
                _, predicted = output.max(1)
                total += targets.size(0)
                correct += predicted.eq(targets).sum().item()
        if scheduler_p:
            scheduler.step()
    loss = test_loss / batch_idx+1
    acc = correct / total

    return {"loss": loss, "acc": acc}

