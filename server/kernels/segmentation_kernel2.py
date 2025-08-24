import numpy as np
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import os

# import torch
import os
import torch
from torch import nn
import torch.nn.functional as F
from torchvision.datasets import MNIST
from torch.utils.data import DataLoader
from torchvision import transforms
from torch.utils.data import DataLoader, random_split
SEED = 123
use_cuda = torch.cuda.is_available()
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
torch.set_float32_matmul_precision('high')

class Dispatcher():
    def __init__(self, queue):
        self.queue = queue
    
    def emit(self, event, data):
        self.queue.put((event, data))

    # def on_train_start(self, trainer, pl_module):

    #     print("================================================= current_training")
    #     total_epochs = trainer.max_epochs
    #     current_epoch = trainer.current_epoch
    #     self.queue.put(('start', None))
    #     self.queue.put(('progress', {'current': 0, 'total': total_epochs}))
        

    # def on_train_epoch_end(self, trainer, pl_module):
    #     curr = trainer.current_epoch
    #     total = trainer.max_epochs
    #     print("================================================= current_training_epoch_end")
    #     self.queue.put(('progress', {'current': curr, 'total': total}))

    # def on_test_end(self, trainer, pl_module):

    #     print("================================================= current_testing_end")
    #     self.queue.put(('result', {'loss': trainer.callback_metrics['test_loss'].item(), 'metric': trainer.callback_metrics['test_acc'].item()}))
    #     self.queue.put(('end', None))


class KernelBase:
    def __init__(self, trial, queue):
        print("segmentation kernel init")
        self.trial = trial
        self.budget = int(trial['budget'])
        self.hparams = trial['params']
        self.model = trial['model']
        self.dataset = trial['dataset']
        self.queue = queue
        self.dispatcher = Dispatcher(self.queue)

    def run(self):
        np.random.seed(SEED)
        if self.dataset=="mnist":
            res = train_mnist(budget=self.budget, hparams=self.hparams, dispatcher=self.dispatcher)
        elif self.dataset=="mscoco":
            # MSCOCO should use CLIP kernel, return error for segmentation kernel
            res = {'loss': 999.0, 'metric': 0.0}
            self.dispatcher.emit('error', {'message': 'MSCOCO dataset should use CLIP kernel'})
        else:
            # Default error for unknown dataset
            res = {'loss': 999.0, 'metric': 0.0}
            self.dispatcher.emit('error', {'message': f'Unknown dataset: {self.dataset}'})
        return res

    
class CustomModel(nn.Module):
    def __init__(self, hparams, channels=1, width=28, height=28, num_classes=10):
        super(CustomModel, self).__init__()
        self.channels = channels
        self.width = width
        self.height = height
        self.num_classes = num_classes
        self.hidden_size = hparams['hidden_size']
        self.learning_rate = hparams['learning_rate']

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
        x = self.model(x)
        output = F.log_softmax(x, dim=1)
        return output



class CustomDataModule():
    def __init__(self, hparams, data_dir: str = '../dataset'):
        super().__init__()
        self.data_dir = data_dir
        self.transform = transforms.Compose(
            [
                transforms.ToTensor(),
                transforms.Normalize((0.1307,), (0.3081,)),
            ]
        )
        self.batch_size = hparams['batch_size']
        self.dims = (1, 28, 28)
        self.num_classes = 10

    def setup(self):
        self.mnist_train = MNIST(
            self.data_dir, train=True, download=True, transform=self.transform
        )
        self.mnist_test = MNIST(
            self.data_dir, train=False, download=True, transform=self.transform
        )
        return DataLoader(self.mnist_train, batch_size=self.batch_size), DataLoader(self.mnist_test, batch_size=self.batch_size)
    
def get_optimizer(hparams, model):
    optimizer = hparams['optimizer']
    lr = hparams['learning_rate']
    weight_decay = hparams['weight_decay']
    momentum = hparams['momentum']
    if optimizer == 'adam':
        return torch.optim.Adam(model.parameters(), weight_decay=weight_decay, lr=lr)
    elif optimizer == 'sgd':
        return torch.optim.SGD(model.parameters(), weight_decay=weight_decay, lr=lr, momentum=momentum)
    elif optimizer == 'rms':
        return torch.optim.RMSprop(model.parameters(), weight_decay=weight_decay, lr=lr, momentum=momentum)
    else:
        raise NotImplementedError
    
def get_scheduler(budget, optimizer):
    return torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, budget)

def get_loss_fn():
    return torch.nn.CrossEntropyLoss()

def setup_training(budget, hparams, model):
    optimizer = get_optimizer(hparams, model)
    scheduler = get_scheduler(budget, optimizer)
    loss_fn = get_loss_fn()
    return optimizer, scheduler, loss_fn


def evaluate(model, test_loader, loss_fn, device):
    model.eval()
    test_loss, correct = 0, 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += loss_fn(output, target).item()
            correct += output.argmax(dim=1).eq(target).sum().item()
    
    test_loss /= len(test_loader.dataset)
    accuracy =  correct / len(test_loader.dataset)
    return test_loss, accuracy


def train_mnist(budget, hparams, dispatcher):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader, test_loader = CustomDataModule(hparams).setup()
    model = CustomModel(hparams).to(device)
    optimizer, scheduler, loss_fn = setup_training(budget, hparams, model)

    model.train()
    dispatcher.emit('start', None)
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
    dispatcher.emit('progress', {'current': budget+1, 'total': budget})

    test_loss, accuracy = evaluate(model, test_loader, loss_fn, device)
    dispatcher.emit('done', {'loss': test_loss, 'metric': accuracy})