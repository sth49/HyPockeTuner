from datetime import datetime
import math
class Trial():
    def __init__(self, id, bracket_id, round_id, trial_id, config=None, budget=None, exp_id=None, is_user_trial=False, model=None, dataset=None):
        self.id = id
        self.name = None
        self.model = model
        self.dataset = dataset
        self.bracket_id = bracket_id
        self.round_id = round_id
        self.trial_id = trial_id
        self.config = config
        self.budget = budget
        self.param_set_id = None
        self.loss = 'None'
        self.metric = 'None'
        self.start_time = datetime.now().timestamp()
        self.end_time = None
        self.exp_id = exp_id
        self.is_user_trial = is_user_trial
        self.is_paused = False
        self.sample = ""


    def update_result(self, loss, metric):
        self.end_time = datetime.now().timestamp()
        self.loss = loss
        self.metric = metric
    
    def to_dict(self):
        if self.loss is None:
            self.loss = 'None'
        elif self.loss == "error":
            self.loss = 'None'
        elif self.loss != 'None' and math.isnan(float(self.loss)):
            self.loss = 'None'
        return {
            "id": self.id,
            "name": self.name,
            "model": self.model,
            "dataset": self.dataset,
            "bracketId": self.bracket_id,
            'paramSetId': self.param_set_id,
            "roundId": self.round_id,
            "trialId": self.trial_id,
            "config": self.config,
            "budget": self.budget,
            "loss": self.loss,
            "metric": self.metric,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "sample": self.sample,
        }
