import uuid

class HParamSet:
    def __init__(self, configspace):
        self.sets = []
        self.configspace = configspace

    def find(self, trial):
        param = trial.config
        for s in self.sets:
            same = True
            for h in self.configspace.hyperparameters:
                if h.dont_pass:
                    continue
                if s[h.name] != param[h.name]:
                    same = False
                    break       

            if s['bracket'] != trial.bracket_id:
                same = False

            if same:
                return s

        return None
        
    def add(self, trial):        
        s = self.find(trial)        
        print("===== trial is", trial.to_dict())

        if not s:
            param = trial.config
            param['id'] = str(uuid.uuid4())
            param['bracket'] = trial.bracket_id
            param['round'] = trial.round_id
            param['index'] = trial.trial_id
            s = param
            self.sets.append(param)

        if s.get('metric') is None:
            s['metric'] = trial.metric
        return s