import statsmodels.api as sm
import numpy as np


class KDEMultivariate(sm.nonparametric.KDEMultivariate):
    def __init__(self, configurations):
        self.configurations = configurations
        data = []
        for config in configurations:
            data.append(np.array(config.to_list()))
        data = np.array(data)
        super().__init__(data, configurations[0].kde_vartypes, 'normal_reference')