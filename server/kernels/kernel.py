import os
import ssl
import numpy as np
import torch
from torch import nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision.datasets import MNIST
from torchvision import transforms

ssl._create_default_https_context = ssl._create_unverified_context
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
torch.set_float32_matmul_precision('high')

SEED = 123


class Dispatcher:
    """Handles communication between training process and the main system."""
    def __init__(self, queue):
        self.queue = queue

    def emit(self, event, data):
        self.queue.put((event, data))


class CustomModel(nn.Module):
    """Simple MLP model for MNIST classification."""
    def __init__(self, hparams, channels=1, width=28, height=28, num_classes=10):
        super().__init__()
        self.hidden_size = hparams['hidden_size']

        self.model = nn.Sequential(
            nn.Flatten(),
            nn.Linear(channels * width * height, self.hidden_size),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(self.hidden_size, self.hidden_size),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(self.hidden_size, num_classes),
        )

    def forward(self, x):
        return F.log_softmax(self.model(x), dim=1)


class CustomDataModule:
    """Data module for loading and preparing MNIST dataset."""
    def __init__(self, hparams, data_dir: str = '../dataset'):
        self.data_dir = data_dir
        self.batch_size = hparams['batch_size']
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.1307,), (0.3081,)),
        ])

    def setup(self):
        train_dataset = MNIST(self.data_dir, train=True, download=True, transform=self.transform)
        test_dataset = MNIST(self.data_dir, train=False, download=True, transform=self.transform)
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size)
        test_loader = DataLoader(test_dataset, batch_size=self.batch_size)
        return train_loader, test_loader


def get_optimizer(hparams, model):
    """Create optimizer based on hyperparameters."""
    optimizer_name = hparams['optimizer']
    lr = hparams['learning_rate']
    weight_decay = hparams['weight_decay']
    momentum = hparams['momentum']

    if optimizer_name == 'adam':
        return torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    elif optimizer_name == 'sgd':
        return torch.optim.SGD(model.parameters(), lr=lr, weight_decay=weight_decay, momentum=momentum)
    elif optimizer_name == 'rms':
        return torch.optim.RMSprop(model.parameters(), lr=lr, weight_decay=weight_decay, momentum=momentum)
    else:
        raise NotImplementedError(f"Optimizer '{optimizer_name}' not supported")


def setup_training(budget, hparams, model):
    """Setup optimizer, scheduler, and loss function for training."""
    optimizer = get_optimizer(hparams, model)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, budget)
    loss_fn = nn.CrossEntropyLoss()
    return optimizer, scheduler, loss_fn


def evaluate(model, test_loader, loss_fn, device):
    """Evaluate model on test set."""
    model.eval()
    test_loss, correct = 0, 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += loss_fn(output, target).item()
            correct += output.argmax(dim=1).eq(target).sum().item()

    test_loss /= len(test_loader.dataset)
    accuracy = correct / len(test_loader.dataset)
    return test_loss, accuracy


def train(budget, hparams, dispatcher):
    """Main training function that runs for the specified budget (epochs)."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader, test_loader = CustomDataModule(hparams).setup()
    model = CustomModel(hparams).to(device)
    optimizer, scheduler, loss_fn = setup_training(budget, hparams, model)

    dispatcher.emit('start', None)

    model.train()
    for epoch in range(1, budget + 1):
        dispatcher.emit('progress', {'current': epoch, 'total': budget})
        for data, target in train_loader:
            data, target = data.to(device), target.to(device)
            optimizer.zero_grad()
            output = model(data)
            loss = loss_fn(output, target)
            loss.backward()
            optimizer.step()
        scheduler.step()

    test_loss, accuracy = evaluate(model, test_loader, loss_fn, device)
    dispatcher.emit('done', {'loss': test_loss, 'metric': accuracy})


class KernelBase:
    """Base kernel class that manages trial execution."""
    def __init__(self, trial, queue):
        self.trial = trial
        self.budget = int(trial['budget'])
        self.hparams = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']
        self.dispatcher = Dispatcher(queue)

    def run(self):
        np.random.seed(SEED)
        train(budget=self.budget, hparams=self.hparams, dispatcher=self.dispatcher)
