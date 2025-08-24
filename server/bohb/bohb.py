import copy
from bohb.kde import KDEMultivariate
from bohb.log import Log
import numpy as np
import scipy
import statsmodels.api as sm
import bohb.configspace as cs
import dask
from bohb.state import STATE



class BOHB:
    def __init__(self, configspace, max_budget, min_budget,
                 eta=3, best_percent=0.15, random_percent=1/3, n_samples=64,
                 bw_factor=3, min_bandwidth=1e-3, n_proc=1):
        self.eta = eta
        self.configspace = configspace
        self.max_budget = max_budget
        self.min_budget = min_budget
        # self.evaluate = evaluate

        self.best_percent = best_percent
        self.random_percent = random_percent
        self.n_samples = n_samples
        self.min_bandwidth = min_bandwidth
        self.bw_factor = bw_factor
        self.n_proc = n_proc

        self.s_max = int(np.log(self.max_budget/self.min_budget) / np.log(self.eta))
        self.budget = (self.s_max + 1) * self.max_budget

        self.kde_good = None
        self.kde_bad = None
        # self.samples = np.array([])
        np.random.seed(123)

    
    def step(self, state):
        if state.update_bracket() == 0:
            print("experiment done!")
            print("bohb finished")
            ret = None
        else:
            state.update_round()
            ret = self.get_sample_from_state(state) # ret = [sample, sample type]
            state.update_sample(ret)
            
        return state, ret

    def evaluating(self, state, sample, iter=None):
        # int(state.r_i)는 iteration의 수. 해당 sample에 대해 loss가 얼마인지 계산함
        if iter is None:
            iter = int(state.r_i)
        return state.evaluate(sample, iter) 

    def done(self, state, loss, acc):
        state.update_j(loss)
        state.after_j()
        return state
    
    def error(self, state, loss):
        """Handle error cases without incrementing j counter"""
        state.handle_error(loss)
        return state
    
    def add_trial(self, state, trial): # trial은 영향을 안줌
        state.trials.append(trial)
        state.callback.append({ "key": "addTrial",
                               "value":{ "config": trial['config']}})
        return state
    
    def narrow_configspace(self, name, state, value=None, lower=None, upper=None, mean=None, sigma=None):
        ret = state.configspace.narrow(name, value, lower, upper, mean, sigma)
        # state.callback.append(  { "key": "narrow_configspace", "value": {"name": name,
        #     "type": ret[0],
        #     "original": ret[1],
        #     "updated": ret[2],}
        # })
        return state
        # new_ith_samples = []
        # new_ith_losses = []
        # for i, sp in enumerate(state.ith_samples):
        #     configuration = sp.to_dict()
        #     if ((value is not None) and (configuration[name] == value)) or (not None in [lower, upper]) and ((configuration[name]<ret[3]['lower']) or (configuration[name]>ret[3]['upper'])):
        #         sample, _ = self.get_sample_from_state(state)
        #         # 얘도 따로 처리??
        #         loss = state.evaluate(sample.to_dict(), int(state.r_i)) 

        #         new_ith_samples.append(sample)
        #         new_ith_losses.append(loss)
        #     # elif (not None in [lower, upper]) and ((configuration[name]<ret[3].lower) or (configuration[name]>ret[3].upper)):
        #     #     sample = self.get_sample_from_state(state)
        #     #     loss = state.evaluate(sample.to_dict(), int(state.r_i)) 
        #     #     new_ith_samples.append(sample)
        #     #     new_ith_losses.append(loss)
        #     else:
        #         new_ith_samples.append(sp)
        #         new_ith_losses.append(state.ith_losses[i])
        # state.ith_samples = new_ith_samples
        # state.ith_losses = new_ith_losses

        # print("###### after #######")
        # for sp in state.ith_samples:
        #     print(sp.to_dict())


    def get_sample_from_state(self, state):
        # print(f"self.kde_good: {state.kde_good}")
        # np.random.seed(123)
        rd = np.random.random()
        if state.kde_good is None or rd< state.random_percent:
            if len(state.samples):
                idx = np.random.randint(0, len(state.samples))
                sample = state.samples[idx]
                state.samples = np.delete(state.samples, idx)
                return [sample, 'samples']
            else:
                return [state.configspace.sample_configuration(), 'random']

        # Sample from the good data
        best_tpe_val = np.inf
        for _ in range(state.n_samples):
            idx = np.random.randint(0, len(state.kde_good.configurations))
            configuration = copy.deepcopy(state.kde_good.configurations[idx])
            for hyperparameter, bw in zip(configuration, state.kde_good.bw):
                if hyperparameter.type == cs.Type.Continuous:
                    value = hyperparameter.value
                    bw = bw * state.bw_factor
                    hyperparameter.value = scipy.stats.truncnorm.rvs(
                        -value/bw, (1-value)/bw, loc=value, scale=bw)
                elif hyperparameter.type == cs.Type.Ordered or hyperparameter.type == cs.Type.Unordered:
                    rd2 = np.random.rand()
                    if rd2 >= (1-bw):
                        idx = np.random.randint(len(hyperparameter.choices))
                        hyperparameter.value = idx
                else:
                    raise NotImplementedError

            tpe_val = (state.kde_bad.pdf(configuration.to_list()) /
                       state.kde_good.pdf(configuration.to_list()))
            if tpe_val < best_tpe_val:
                best_tpe_val = tpe_val
                best_configuration = configuration
        return [best_configuration, 'tpe']

    # def optimize(self):
    #     logs = Log(self.s_max+1)
    #     # df_logs = pd.DataFrame(columns=['s', 'i', 'j', 'n', 'r', 'n_i', 'r_i', 'sample', 'loss', 'sample_type', 'prob'])
    #     for s in reversed(range(self.s_max + 1)):
    #         logs[s] = {}
    #         n = int(np.ceil(
    #             (self.budget * (self.eta ** s)) / (self.max_budget * (s + 1))))
    #         r = self.max_budget * (self.eta ** -s)
    #         self.kde_good = None
    #         self.kde_bad = None
    #         self.samples = np.array([])
            
    #         for i in range(s+1):
    #             n_i = n * self.eta ** (-i)  # Number of configs
    #             r_i = r * self.eta ** (i)  # Budget
    #             logs[s][r_i] = {'loss': np.inf}

    #             samples = []
    #             losses = []
    #             for j in range(n):
    #                 print(f"Current {s}, {i}, {j}")
    #                 sample, sample_tp, prob = self.get_sample()
    #                 # print(sample.to_dict())
    #                 if self.n_proc > 1:
    #                     loss = dask.delayed(self.evaluate)(sample.to_dict(), int(r_i))
    #                 else:
    #                     loss = self.evaluate(sample.to_dict(), int(r_i))
    #                 samples.append(sample)
    #                 losses.append(loss)
    #                 # df_logs.loc[len(df_logs)] = [s, i, j, n, r, n_i, r_i, sample.to_dict(), loss, sample_tp, prob]
    #                 # print(f'loss is {loss}')
    #                 # print()
    #                 # print("############################")
    #                 # print()
    #             if self.n_proc > 1:
    #                 losses = dask.compute(
    #                     *losses, scheduler='processes', num_workers=self.n_proc)
    #             midx = np.argmin(losses)
    #             logs[s][r_i]['loss'] = losses[midx]
    #             logs[s][r_i]['hyperparameter'] = samples[midx]

    #             if logs[s][r_i]['loss'] < logs.best['loss']:
    #                 logs.best['loss'] = logs[s][r_i]['loss']
    #                 logs.best['budget'] = r_i
    #                 logs.best['hyperparameter'] = logs[s][r_i]['hyperparameter']

    #             n = int(np.ceil(n_i/self.eta))
    #             idxs = np.argsort(losses)
    #             self.samples = np.array(samples)[idxs[:n]]
    #             n_good = int(np.ceil(self.best_percent * len(samples)))
    #             # print(n_good)
    #             # print(len(samples[0].kde_vartypes))
    #             # exit()
    #             # 뽑은 sample의 수가 n_good을 지정할 만큼 충분한지 판별 - best_percent: default=0.15
    #             # n_good이 11 이상이면 kde_good을 구함
    #             if n_good > len(samples[0].kde_vartypes) + 2: 
    #                 good_data = np.array(samples)[idxs[:n_good]]
    #                 bad_data = np.array(samples)[idxs[n_good:]]
    #                 self.kde_good = KDEMultivariate(good_data)
    #                 self.kde_bad = KDEMultivariate(bad_data)
    #                 self.kde_bad.bw = np.clip(
    #                     self.kde_bad.bw, self.min_bandwidth, None)
    #                 self.kde_good.bw = np.clip(
    #                     self.kde_good.bw, self.min_bandwidth, None)
    #     # return logs, df_logs
    #     return logs
    
    # def get_sample(self):
    #     # print(f"self.kde_good: {self.kde_good}")
    #     p_sample = np.random.random() 
    #     if self.kde_good is None or p_sample < self.random_percent:
    #         if len(self.samples):
    #             idx = np.random.randint(0, len(self.samples))
    #             sample = self.samples[idx]
    #             self.samples = np.delete(self.samples, idx)
    #             return sample, 'sample from self.samples', p_sample
    #         else:
    #             return self.configspace.sample_configuration(), 'random sampling', p_sample

    #     # Sample from the good data
    #     best_tpe_val = np.inf
    #     for _ in range(self.n_samples):
    #         idx = np.random.randint(0, len(self.kde_good.configurations))
    #         configuration = copy.deepcopy(self.kde_good.configurations[idx]) # good configuration중에서 하나 뽑음
    #         # 해당 configuration에 있는 hyperparameter 값을 변경
    #         for hyperparameter, bw in zip(configuration, self.kde_good.bw):
    #             if hyperparameter.type == cs.Type.Continuous: # 연속일때
    #                 value = hyperparameter.value
    #                 bw = bw * self.bw_factor
    #                 hyperparameter.value = scipy.stats.truncnorm.rvs( 
    #                     -value/bw, (1-value)/bw, loc=value, scale=bw)
    #             elif hyperparameter.type == cs.Type.Discrete: # 이산일때
    #                 if np.random.rand() >= (1-bw):
    #                     idx = np.random.randint(len(hyperparameter.choices))
    #                     hyperparameter.value = idx
    #             else:
    #                 raise NotImplementedError

    #         tpe_val = (self.kde_bad.pdf(configuration.to_list()) /
    #                    self.kde_good.pdf(configuration.to_list()))
    #         # 이거를 n_samples번만큼 수행해서 제일 좋은 것을 return 
    #         if tpe_val < best_tpe_val:
    #             best_tpe_val = tpe_val
    #             best_configuration = configuration
    #     return best_configuration, 'searching best config.', p_sample

