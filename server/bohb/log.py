
import numpy as np


class Log():
    def __init__(self, size):
        self.size = size
        self.logs = np.empty(self.size, dtype=dict)
        self.best = {'loss': np.inf}

    def __getitem__(self, index):
        return self.logs[index]

    def __setitem__(self, index, value):
        self.logs[index] = value

    def __repr__(self):
        string = []
        string.append(f's_max: {self.size}')
        for s, log in enumerate(self.logs):
            string.append(f's: {s}')
            for budget in log:
                string.append(f'Budget: {budget}')
                string.append(f'Loss: {log[budget]["loss"]}')
                string.append(str(log[budget]['hyperparameter']))
        string.append('Best Hyperparameter Configuration:')
        string.append(f'Budget: {self.best["budget"]}')
        string.append(f'Loss: {self.best["loss"]}')
        string.append(str(self.best['hyperparameter']))
        return '\n'.join(string)