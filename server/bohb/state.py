
from notification import ConditionPair, ExperimentFinishCondition, TrialFinishCondition, MetricReachCondition, RoundFinishCondition, MetricImproveByCondition, BracketFinishCondition
import numpy as np
# from bohb.kde import KDEMultivariate
from bohb.log import Log
from datetime import datetime
from queue import PriorityQueue
import statsmodels.api as sm
import copy
import time



class KDEMultivariate(sm.nonparametric.KDEMultivariate):
    def __init__(self, configurations):
        self.configurations = configurations
        data = []
        for config in configurations:
            data.append(np.array(config.to_list()))
        data = np.array(data)
        super().__init__(data, configurations[0].kde_vartypes, 'normal_reference')



class STATE:
    def __init__(self, configspace, max_budget, min_budget,
                 eta=3, best_percent=0.15, random_percent=1/3, n_samples=64,
                 bw_factor=3, min_bandwidth=1e-3, n_proc=1, id=None):
        self.exp_id = id
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
        self.logs =Log(self.s_max+1)
        self.is_first = 1

        
        self.s = self.s_max+1
        self.i = -1
        self.j = -1
        
        
        self.n = None
        self.r = None
        self.kde_good = None
        self.kde_bad = None
        self.samples = np.array([])
        
        
        self.n_i = None
        self.r_i = None
        self.ith_samples = []
        self.ith_losses = []
        
        
        self.sample = None
        self.loss = None
        
        # after j
        self.midx = None
        self.idxs = None
        self.n_good = None

        # trials
        self.user_done_trials = []
        self.done_trials = []
        # self.trial_id = ''
        self.count = 1
        
        # best
        self.best_trial = None

        # callback
        self.callback = []
        self.callback_idx = 0
        self.all_callbacks = []

        self.current_trial = None
        self.current_trial_type = None  # "bohb" or "user"

        # notification
        self.noti_conds = []
        self.subs = set()

        # best
        self.best = {"loss": np.inf, "hyperparameter": None, "budget": None, "id": None}

        # # of first bracket trials
        self.first_bracket_trials = 0
    
    def add_callback(self, key, value):
        self.callback_idx += 1
        self.callback.append({
            "key": key,
            "value": value,
            "id": self.callback_idx,
            "expId": self.exp_id
        })
        
    def init_info(self):
        print("init info")
        brackets = []
        self.count = 0
        for s in reversed(range(self.s_max+1)):
            n = int(np.ceil(
                    (self.budget * (self.eta ** s)) / (self.max_budget * (s + 1))))
            r = self.max_budget * (self.eta ** -s)
            rounds = []
            print(f"##### New Bracket Started - 's': {s}")
            for i in range(s+1):
                n_i = n * self.eta ** (-i)  # Number of configs
                r_i = r * self.eta ** (i)  # Budget
                print("n_i: ", n_i, "r_i: ", r_i)
                rounds.append({
                    'id': f'{s}-{i}',
                    'bracketId': s,
                    'roundId': i,
                    'startTime':'',
                    'endTime':'',
                    'budget': r_i,
                    'defaultNumTrials': n,
                })
                print(f"##### New Round Started - i: {i}, Number of configs: {n}, Budget: {r_i}")
                trials = []
                for j in range(n):
                    trial_info = [s, i, j]
                    print(trial_info)
                    self.count += 1
                    print(f"##### jth step - 'j': {j}")
                    trials.append({
                        'id': '',
                        'bracketId': s,
                        'roundId': i,
                        'trialId': j,
                        'budget': r_i,
                        'params': None,
                        'metric': None,
                        'loss': None,
                        'startTime':'',
                        'endTime':'',
                        'clusterId': '',
                        'type': 'bohb',
                    })
                rounds[i]['trials'] = trials
                n = int(np.ceil(n_i/self.eta))
            if s == self.s_max:
                self.first_bracket_trials = self.count
                # self.add_callback("firstBracketTrials", self.first_bracket_trials)
            brackets.append({
                'id': s,
                'rounds': rounds,
                'startTime':'',
                'endTime':'',
            })
        print("Total number of trials: ", self.count)
        self.add_callback("brackets", brackets)
        self.add_callback("totalTrials", self.count)
        self.all_callbacks += self.callback
        self.callback = []
        return 0
    
    
    def experiment_init(self):
        que = PriorityQueue()
        prior = 1
        print("Making priority queue")
        for s in reversed(range(self.s_max+1)):
            n = int(np.ceil(
                    (self.budget * (self.eta ** s)) / (self.max_budget * (s + 1))))
            r = self.max_budget * (self.eta ** -s)
            print(f"##### New Bracket Started - 's': {s}")
            
            for i in range(s+1):
                n_i = n * self.eta ** (-i)  # Number of configs
                r_i = r * self.eta ** (i)  # Budget
                print("n_i: ", n_i, "r_i: ", r_i)
                print(f"##### New Round Started - i: {i}, Number of configs: {n}, Budget: {r_i}")
                for j in range(n):
                    trial_info = [s, i, j]
                    print(trial_info)
                    que.put((prior, trial_info))
                    print(f"##### jth step - 'j': {j}")
                n = int(np.ceil(n_i/self.eta))
                prior +=1
        return prior, que

        

    def update_bracket(self):
        # update s
        if self.is_first or (self.i == -1):
            self.s -= 1
            if self.s == -1:
                print("Experiment is finished in state.py")
                return 0
            if self.is_first: 
                self.is_first = 0
            else:
                self.add_callback("roundDone", 
                          {"bracketId": self.s+1,
                            "roundId": self.s+1,
                           "endTime": datetime.now().timestamp(),
                          })
                self.check_cond(round=self.s+1, bracket=self.s+1)
                
                self.add_callback("bracketDone", {
                    "bracketId": self.s+1,
                    "endTime": datetime.now().timestamp(),
                })
                self.check_cond(bracket=self.s+1)
            self.add_callback("bracketStart", {
                "bracketId": self.s,
                "startTime": datetime.now().timestamp(),
            })

            self.logs[self.s] = {}
            self.n = int(np.ceil((self.budget * (self.eta ** self.s)) / (self.max_budget * (self.s + 1))))
            self.r = self.max_budget * (self.eta ** -self.s)
            self.kde_good = None
            self.kde_bad = None
            self.samples = np.array([])
        else:
            return 1
        
    def update_round(self):
        # update i
        if (self.j == -1):
            try:
                if (self.i != -1):
                    self.add_callback("roundDone", {
                        "bracketId": self.s,
                        "roundId": self.i,
                        # "roundId": f'{self.s}-{self.i}',
                        "endTime": datetime.now().timestamp(),
                    })
                    self.check_cond(round=self.i, bracket=self.s)
                    # for cond in self.noti_conds:
                    #     if (cond is not None) and (cond.active) and (cond.event_cond is not None) and (isinstance(cond.event_cond, RoundFinishCondition)):
                    #         if (cond.event_cond.test(self.s, self.i)):
                    #             cond.emit("satisfied", subs=self.subs)
                    #             self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied"))
                    #             break
            except:
                pass
            self.i += 1
            
            self.n_i = self.n * self.eta ** (-self.i) # Number of configs
            self.r_i = self.r * self.eta ** (self.i)  # Budget
            print("n_i: ", self.n_i, "r_i: ", self.r_i)
            # print("n", self.n)
            self.logs[self.s][self.r_i] = {'loss': np.inf}
            self.ith_samples = []
            self.ith_losses = []
            self.add_callback("roundStart", {
                # "roundId": f'{self.s}-{self.i}',
                "roundId": self.i,
                "bracketId": self.s,
                "startTime": datetime.now().timestamp(),
                # "Number of configs": self.n,
                # "Budget" : int(self.r_i),
            })

    def update_sample(self, ret):
        self.sample = ret[0]
        self.ith_samples.append(ret[0])
    
    def save_trial(self, trial, err=False):
        # Check if trial is already in done_trials to prevent duplicates
        if self.current_trial_type == "bohb":
            existing_trial = next((t for t in self.done_trials if t.id == trial.id), None)
            if existing_trial:
                print(f"[DUPLICATE] Trial {trial.id} already exists in done_trials, skipping")
                return
        
        if err:
            if self.current_trial_type == "user":
                self.user_done_trials.append(trial)
                self.add_callback("userTrialDone", trial.to_dict())
                self.check_cond(is_user=True, trial=trial)
            elif self.current_trial_type == "bohb":
                self.done_trials.append(trial)
                self.add_callback("curNumTrials", len(self.done_trials))
                self.add_callback("trialDone", trial.to_dict())
        else:
            if self.current_trial_type == "user":
                self.user_done_trials.append(trial)
                self.add_callback("userTrialDone", trial.to_dict())
                self.check_cond(is_user=True, trial=trial)
            elif self.current_trial_type == "bohb":
                self.done_trials.append(trial)
                print(f"##### jth step - 'j': {trial.to_dict()['trialId']}, 'loss': {trial.to_dict()['loss']}")
                self.add_callback("curNumTrials", len(self.done_trials))
                self.add_callback("trialDone", trial.to_dict())
            if self.best_trial is None or self.best_trial.metric < trial.metric:
                self.best_trial = trial
                self.check_cond(trial=self.best_trial)
                self.add_callback("bestTrial", trial.to_dict())
    def get_trials(self):
        trials = []
        for t in self.done_trials:
            trials.append(t.to_dict())
        for t in self.user_done_trials:
            trials.append(t.to_dict())
        return trials

    def check_cond(self, is_user=False, trial=None, round=None, bracket=None, prog_type=False, utilization=None, temperature=None, exception=None, disk_usage=None):
        total_brackets = self.s_max + 1  # s_max is 0-indexed, so add 1 for total count
        for cond in self.noti_conds:
            if cond.active and cond.status ==None:
                print("active condition", cond.event_cond.key)
                if cond.event_cond.test(is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets):
                    print("satisfied condition", cond.event_cond.key)   
                    self.add_callback("updateNotiCond", cond.emit("satisfied"))
                    self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied"))
                    time.sleep(0.5)
                    
                    
    def check_timeout(self):
        for cond in self.noti_conds:
            if cond.active and cond.status==None and cond.timeout_cond and cond.timeout_cond.test():
                # cond.emit("expired")
                self.add_callback("updateNotiCond", cond.emit("expired"))
                self.add_callback("push", cond.timeout_cond.emit(cond.id, "expired", cond.event_cond))
                
        
                # if cond.timeout is not None and cond.timeout < time.time():
                    
                    # cond.emit("satisfied", trial, subs=self.subs)
        # if isUser:
        #     print("check cond for user trial")
        #     for cond in self.noti_conds:
        #         if  cond.event_cond and cond.active and isinstance(cond.event_cond, TrialFinishCondition):
        #             if cond.event_cond.test(trial.id, trial.metric):
        #                 cond.emit("satisfied", trial, subs=self.subs)
        #                 self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied", trial))
        #                 break
        # elif trial is not None:
        #     print("check cond for bohb trial")
        #     for cond in self.noti_conds:
        #         if cond.event_cond and cond.active and ((isinstance(cond.event_cond, MetricImproveCondition)) or(isinstance(cond.event_cond, MetricReachCondition))):
        #             if cond.event_cond.test(trial.metric):
        #                 if (isinstance(cond.event_cond, MetricReachCondition)):
        #                     cond.active = False
        #                 cond.emit("satisfied", trial, subs=self.subs)
        #                 self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied", trial))
        # elif round is not None:
        #     print("check cond for round finish")
        #     for cond in self.noti_conds:
        #         if cond.event_cond and cond.active and isinstance(cond.event_cond, RoundFinishCondition):
        #             print("round_id", round)
        #             print("bracket_id", bracket)
        #             if cond.event_cond.test(bracket_id=bracket, round_id=round):
                        
        #                 print("emit round finish condition: ", round)
                        
        #                 cond.emit("satisfied", subs=self.subs)
        #                 self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied", None))
        #                 break
        # elif bracket is not None:
        #     print("check cond for bracket finish")
        #     for cond in self.noti_conds:
        #         if cond.event_cond and cond.active and isinstance(cond.event_cond, BracketFinishCondition):
        #             if cond.event_cond.test(bracket):
        #                 cond.emit("satisfied", subs=self.subs)
        #                 self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied", None))
        #                 break
        # elif finish:
            
                        

    def add_cond(self, data):
        print("============== =============== add cond")
        noti_cond_pair = ConditionPair.from_json(data, self.exp_id)
        
        self.noti_conds.insert(0, noti_cond_pair)
    
    def edit_cond(self, data):
        noti_cond_pair_id = data['id']
        for noti_cond in self.noti_conds:
            if noti_cond.id == noti_cond_pair_id:
                noti_cond.active = data["active"]
                break
    def remove_cond(self, data):
        noti_cond_pair_id = data['id']
        for noti_cond in self.noti_conds:
            if noti_cond.id == noti_cond_pair_id:
                self.noti_conds.remove(noti_cond)
                break
        
    
    def update_j(self, loss):
        self.j += 1
        self.loss = loss
        self.ith_losses.append(loss)

    def handle_error(self, loss):
        """Handle error by incrementing j counter and treating it as a very poor result"""
        # Increment j counter for errors to maintain proper BOHB progression
        self.j += 1
        self.loss = loss
        self.ith_losses.append(loss)
        # Note: sample is already added to ith_samples in update_sample(), no need to add again
    
    def after_j(self):
        if (self.j == self.n -1):
            self.j = -1
            self.midx = np.argmin(self.ith_losses)
            self.logs[self.s][self.r_i]['loss'] = self.ith_losses[self.midx]
            self.logs[self.s][self.r_i]['hyperparameter'] = self.ith_samples[self.midx]
            
            if self.logs[self.s][self.r_i]['loss'] < self.logs.best['loss']:
                self.logs.best['loss'] = self.logs[self.s][self.r_i]['loss']
                self.logs.best['budget'] = self.r_i
                self.logs.best['hyperparameter'] = self.logs[self.s][self.r_i]['hyperparameter']

            self.n = int(np.ceil(self.n_i/self.eta))
            self.idxs = np.argsort(self.ith_losses)
            print("######### index!!!!! ######### ",self.idxs)
            self.samples = np.array(self.ith_samples)[self.idxs[:self.n]]
            print("######### samples!!!!! ######### ")
            for sample in self.samples:
                print(sample.to_dict())
                print()
            self.n_good = int(np.ceil(self.best_percent * len(self.ith_samples)))
            print("n_good", self.n_good)
            if self.n_good > len(self.ith_samples[0].kde_vartypes) + 2:
                good_data = np.array(self.ith_samples)[self.idxs[:self.n_good]]
                bad_data = np.array(self.ith_samples)[self.idxs[self.n_good:]]
                print("==============================")
                for sample in good_data:
                    print(sample.to_dict())
                    print()
                print("##############")
                for sample in bad_data:
                    print(sample.to_dict())
                    print()
                print("==============================")
                self.kde_good = KDEMultivariate(good_data)
                self.kde_bad = KDEMultivariate(bad_data)
                self.kde_bad.bw = np.clip(
                    self.kde_bad.bw, self.min_bandwidth, None)
                self.kde_good.bw = np.clip(
                    self.kde_good.bw, self.min_bandwidth, None)
                print("kde_good", self.kde_good)
                print("kde_bad", self.kde_bad)
                configuration = copy.deepcopy(self.kde_good.configurations[1])
                print(configuration.to_list())
                tpe_val = (self.kde_bad.pdf(configuration.to_list()) /
                    self.kde_good.pdf(configuration.to_list()))
                print(tpe_val)
                    
            if self.i == self.s:
                self.i=-1
    
    def experiment_done(self):
        bestAcc = 0
        bestTrial=None
        print("Experiment finished")
        self.add_callback("roundDone", 
                          {"bracketId": self.s,
                            "roundId": self.s,
                            #   "roundId": f'{self.s}-{self.s}',
                           "endTime": datetime.now().timestamp(),
                          })
        self.check_cond(round=self.s, bracket=self.s)
        self.add_callback("bracketDone", 
                          {"bracketId": self.s,
                           "endTime": datetime.now().timestamp(),
                          })
        self.check_cond(bracket=self.s)
        for t in self.done_trials:
            if bestAcc < t.metric:
                bestAcc = t.metric
                bestTrial = t
        # self.check_cond(prog_type="finish", trial=bestTrial)
        
        # for cond in self.noti_conds:
        #     if cond.event_cond and cond.active and isinstance(cond.event_cond, ExperimentFinishCondition):
        #         cond.emit("satisfied", trial=bestTrial, subs=self.subs)
        #         self.add_callback("push", cond.event_cond.emit(cond.id, "satisfied", bestTrial))
        #         print("emit experiment finish condition")
        #         break
        # self.check_cond(finish=True, trial=bestTrial)
        
    
        
        


