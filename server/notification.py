import json
import uuid
from datetime import datetime

METRIC_REACH = 'metric-reached'
METRIC_IMPROVE_BY = 'metric-improved-by'
METRIC_IMPROVE = 'metric-improved'
BRACKET_FINISH = 'bracket-done'
ROUND_FINISH = 'round-done'
TRIAL_FINISH = 'trial-done'
TIMEOUT = 'timeout'
EXCEPTION_HAPPEN = 'exception-raised'
EXPERIMENT_FINISH = 'experiment-done'
EXPERIMENT_START = 'experiment-started'
# EXPERIMENT_CANCEL = 'experiment-cancel'
EXPERIMENT_PAUSE = 'experiment-paused'
EXPERIMENT_RESUME = 'experiment-resumed'
LOW_UTILIZATION = 'low-utilization'
HIGH_TEMPERATURE = 'high-temperature'
HIGH_USAGE = 'high-usage'

CUSTOM = 'custom'

PRIVATE_KEY = "VAPID_KEY_REMOVED"
from pywebpush import webpush

def get_condition(cond, exp_id):
    print(cond['type'])
    print("====")
    if cond['type']==METRIC_REACH:
        return MetricReachCondition(cond['id'], cond['target'], cond['recurring'], exp_id)
    elif cond['type']==METRIC_IMPROVE_BY:
        return MetricImproveByCondition(cond['id'], cond['base'], cond['by'], cond['recurring'], exp_id)
    elif cond['type']==METRIC_IMPROVE:
        return MetricImproveCondition(cond['id'], cond['base'], cond['recurring'], exp_id)
    elif cond['type']==EXPERIMENT_START:
        return ExperimentStartCondition(cond['id'], exp_id)
    elif cond['type']==EXPERIMENT_PAUSE:
        return ExperimentPauseCondition(cond['id'], exp_id)
    elif cond['type']==EXPERIMENT_RESUME:
        return ExperimentResumeCondition(cond['id'], exp_id)
    elif cond['type']==EXPERIMENT_FINISH:
        return ExperimentFinishCondition(cond['id'], exp_id)
    elif cond['type'] ==TRIAL_FINISH:
        return TrialFinishCondition(cond['id'], cond['trialId'], exp_id)
    elif cond['type'] == BRACKET_FINISH:
        return BracketFinishCondition(cond['id'], cond['bracketId'], exp_id, cond['bracketLength'] if 'bracketLength' in cond else 3)
    elif cond['type'] == ROUND_FINISH:
        return RoundFinishCondition(cond['id'],cond['bracketId'], cond['roundId'], exp_id, cond['bracketLength'] if 'bracketLength' in cond else 3)
    elif cond['type'] == TIMEOUT:
        return TimeoutCondition(cond['id'], cond['time'], exp_id)
    elif cond['type'] == LOW_UTILIZATION:
        return LowUtilizationCondition(cond['id'], cond['utilization'], exp_id)
    elif cond['type'] == HIGH_TEMPERATURE:
        return HighTemperatureCondition(cond['id'], cond['temperature'], exp_id)
    elif cond['type'] == HIGH_USAGE:
        return HigUsageCondition(cond['id'], cond['usage'], exp_id)
    elif cond['type'] == EXCEPTION_HAPPEN:
        return ExceptionHappenCondition(cond['id'], exp_id)

# class NOTIFICATION:
#     def __init__(self, n_type, cond_id, status, trial_id=None, metric=None, display=None, target=None, bracket_id=None, round_id=None, target_time=None):
#         self.id = str(uuid.uuid4())
#         self.time = datetime.now().timestamp()
#         self.type = n_type
#         self.cond_id = cond_id
#         self.status = status
#         self.trial_id = trial_id
#         self.metric = metric
#         self.target = target
#         self.bracket_id = bracket_id
#         self.round_id = round_id
#         self.target_time = target_time
#         self.display = display

#     def to_json(self):
#         return dict(id=self.id, time=self.time, type=self.type, condId=self.cond_id, trialId=self.trial_id, metric=self.metric, display=self.display, status=self.status, target=self.target, bracketId=self.bracket_id, roundId=self.round_id, targetTime = self.target_time)
    


class NOTIFICATION:
    def __init__(self, n_type, cond_id, status, title, content, exp_id=None):
        self.id = str(uuid.uuid4())
        self.type = n_type
        self.time = datetime.now().timestamp()
        self.cond_id = cond_id
        self.status = status
        self.title = title
        self.content = content
        self.exp_id = exp_id
        # self.display = display

    def to_json(self):
        return dict(id=self.id, type=self.type, time=self.time, condId=self.cond_id, title=self.title, content=self.content, status=self.status, expId=self.exp_id)
        


class ConditionPair:
    def __init__(self, id, event_cond, timeout_cond, created_at, confirmed=False):
        self.id = id
        self.event_cond = event_cond
        self.timeout_cond = timeout_cond
        self.created_at = created_at
        self.active = True
        self.status = None
        self.confirmed = confirmed

    def to_json(self):
        return dict(id=self.id, eventCond=self.event_cond.to_json(), timeoutCond=self.timeout_cond.to_json() if self.timeout_cond is not None else None, createdAt=self.created_at, confirmed=self.confirmed, active=self.active, status=self.status)

    def emit(self, status):
        if status =="satisfied":
            print("emit satisfied")
            
            if (isinstance(self.event_cond, HighTemperatureCondition) 
                or isinstance(self.event_cond, HigUsageCondition) 
                or isinstance(self.event_cond, LowUtilizationCondition) 
                or isinstance(self.event_cond, ExceptionHappenCondition)
                or isinstance(self.event_cond, ExperimentPauseCondition)
                or isinstance(self.event_cond, ExperimentResumeCondition)
                or (isinstance(self.event_cond,  MetricImproveByCondition) and self.event_cond.recurring) 
                or (isinstance(self.event_cond,  MetricReachCondition) and self.event_cond.recurring) 
                or (isinstance(self.event_cond,  MetricImproveCondition) and self.event_cond.recurring) 
                ):
                self.status = None
            else:
                self.status = "satisfied"
            
            # self.active = True if (isinstance(self.event_cond,  MetricImproveByCondition) and self.event_cond.recurring) else False
            self.event_cond.mark_as_notified()
            # value = self.event_cond.emit(self.id, status)
            # data = dict(key=self.event_cond.key, value=value, CALLBACK="https://example.com/read")
            # try:
            #     for sub_string in subs:
            #         sub  = json.loads(sub_string)
            #         res = webpush(sub, data=json.dumps(data), vapid_private_key=PRIVATE_KEY, vapid_claims={"sub": "mailto:admin@example.com"})
            #         print("sent a push", res)
            # except Exception as e:
            #     print(e)
            #     import traceback
            #     traceback.print_exc()
        if status == "expired":
            self.status = "expired"
            self.active = False
            self.timeout_cond.mark_as_notified()
            # value = self.timeout_cond.emit()
            # data = dict(key=self.event_cond.key, value=value, CALLBACK="https://example.com/read")
            # try:
            #     for sub_string in subs:
            #         sub  = json.loads(sub_string)
            #         res = webpush(sub, data=json.dumps(data), vapid_private_key=PRIVATE_KEY, vapid_claims={"sub": "mailto:admin@example.com"})
            #         print("sent a push", res)
            # except Exception as e:
            #     print(e)
            #     import traceback
            #     traceback.print_exc()
        return self.to_json()

    @staticmethod
    def from_json(json, exp_id=None):    
        return ConditionPair(json['id'], get_condition(json['eventCond'], exp_id), get_condition(json['timeoutCond'], exp_id) if 'timeoutCond' in json and json['timeoutCond'] is not None else None, json['createdAt'])


class NotificationCondition:
    def __init__(self, id, exp_id=None):
        self.id = id
        self.exp_id = exp_id
        self.notified_at = None
    
    def mark_as_notified(self):
        self.notified_at = datetime.now().timestamp()

    def to_json(self):
        return dict(id=self.id, notifiedAt=self.notified_at)
    

# Argument: is_user, trial, round, bracket, finish
class ExperimentStartCondition(NotificationCondition):
    def __init__(self, id, exp_id):
        self.key = "Experiment Started"
        self.content = None
        super().__init__(id, exp_id)
    
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        return prog_type=="start"
    
    def emit(self, cond_id, status):
        self.content = f'Exp ID: {self.exp_id[:3]}'
        return NOTIFICATION(EXPERIMENT_START, cond_id, status, self.key, self.content, self.exp_id).to_json()
    
    def to_json(self):
        return dict(type=EXPERIMENT_START, id=self.id)
    
class ExperimentPauseCondition(NotificationCondition):
    def __init__(self, id, exp_id):
        self.key = "Experiment Paused"
        self.content = None
        super().__init__(id, exp_id)
    
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        return prog_type=="pause"
    
    def emit(self, cond_id, status):
        self.content = f'Exp ID: {self.exp_id[:3]}'
        return NOTIFICATION(EXPERIMENT_PAUSE, cond_id, status, self.key, self.content, self.exp_id).to_json()
    
    def to_json(self):
        return dict(type=EXPERIMENT_PAUSE, id=self.id)
    
class ExperimentResumeCondition(NotificationCondition):
    def __init__(self, id, exp_id):
        self.key = "Experiment Resumed"
        self.content = None
        super().__init__(id, exp_id)
    
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        print("resume test", prog_type, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage)
        return prog_type=="resume"
    
    def emit(self, cond_id, status):
        self.content = f'Exp ID: {self.exp_id[:3]}'
        return NOTIFICATION(EXPERIMENT_RESUME, cond_id, status, self.key, self.content, self.exp_id).to_json()
    
    def to_json(self):
        return dict(type=EXPERIMENT_RESUME, id=self.id)

    
class ExperimentFinishCondition(NotificationCondition):
    def __init__(self, id, exp_id):
        self.key = "Experiment Done"
        self.content = None
        super().__init__(id, exp_id)
    
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        return prog_type=="finish"
    
    def emit(self, cond_id, status):
        self.content = f'Exp ID: {self.exp_id[:3]}'
        return NOTIFICATION(EXPERIMENT_FINISH, cond_id, status, self.key, self.content, self.exp_id).to_json()
        # return NOTIFICATION(EXPERIMENT_FINISH, cond_id, status, trial.id, trial.metric, self.key).to_json()
    
    def to_json(self):
        return dict(type=EXPERIMENT_FINISH, id=self.id)



class MetricReachCondition(NotificationCondition):
    def __init__(self, id, target, recurring=False, exp_id = None):
        self.target = target 
        self.key = f'Target Performance({self.target:.3f}) Reached'
        self.content = None
        self.timeout_key = f'Target Performance ({self.target:.3f}) Reached'
        self.recurring = recurring
        super().__init__(id, exp_id)

    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if trial is None:
            return False
        if trial.metric >= self.target:
            # self.key = f'Target Metric ({self.target:.3f}) Reached: {trial.metric:.3f}({trial.id[:3]})'
            if total_brackets is not None:
                self.content = f'Trial {total_brackets - trial.bracket_id}-{trial.round_id + 1}-{trial.trial_id + 1} ({trial.metric:.3f})'
            else:
                self.content = f'Trial ID: {trial.id[:3]}({trial.metric:.3f})'
            return True
        return False
    
    def emit(self, cond_id, status):

        return NOTIFICATION(METRIC_REACH, cond_id, status, self.key, self.content, self.exp_id).to_json()
        # noti = NOTIFICATION(METRIC_REACH, cond_id, status, trial.id, trial.metric, self.key).to_json()
        # return noti 
    
    def to_json(self):
        return dict(type=METRIC_REACH, id=self.id, target=self.target, recurring=self.recurring)
    
class MetricImproveByCondition(NotificationCondition):
    def __init__(self, id, base, by, recurring, exp_id):
        self.base = base
        self.by = by
        self.key = f'Performance Improved by {self.by} from {self.base:.3f}'
        self.content = None
        self.timeout_key = f'Performance Improved by {self.by}'  
        self.recurring = recurring
        super().__init__(id, exp_id)

    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if trial is None:
            return False
        if  trial.metric > self.base + self.by:
            if total_brackets is not None:
                self.content = f'Trial {total_brackets - trial.bracket_id}-{trial.round_id + 1}-{trial.trial_id + 1} ({trial.metric:.3f})'
            else:
                self.content = f'Trial ID: {trial.id[:3]}({trial.metric:.3f})'
            # self.key = f'Metric Improved by {self.by}: {self.base:.3f} -> {trial.metric:.3f}({trial.id[:3]})'
            if self.recurring:
                self.key = f'Performance Improved by {self.by} from {self.base:.3f}'
                self.base = trial.metric
            return True
        return False
    
    def emit(self, cond_id, status):
        return NOTIFICATION(METRIC_IMPROVE_BY, cond_id, status, self.key, self.content, self.exp_id).to_json()

    def to_json(self):
        return dict(type=METRIC_IMPROVE_BY, id=self.id, base=self.base, by=self.by, recurring=self.recurring)
    
    
class MetricImproveCondition(NotificationCondition):
    def __init__(self, id, base, recurring, exp_id):
        self.base = base
        self.key = f'Performance Improved from {self.base:.3f}'
        self.content = None
        self.timeout_key = f'Performance Improved'
        self.recurring = recurring
        super().__init__(id, exp_id)

    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if trial is None:
            return False
        if trial.metric > self.base:
            # self.key = f'Metric Improved: {self.base:.3f} -> {trial.metric:.3f}({trial.id[:3]})'
            if total_brackets is not None:
                self.content = f'Trial {total_brackets - trial.bracket_id}-{trial.round_id + 1}-{trial.trial_id + 1} ({trial.metric:.3f})'
            else:
                self.content = f'Trial ID: {trial.id[:3]}({trial.metric:.3f})'
            if self.recurring:
                self.key = f'Performance Improved from {self.base:.3f}'
                self.base = trial.metric
            return True
        return False
    
    def emit(self, cond_id, status):
        return NOTIFICATION(METRIC_IMPROVE, cond_id, status, self.key, self.content, self.exp_id).to_json()

    def to_json(self):
        return dict(type=METRIC_IMPROVE, id=self.id, base=self.base, recurring=self.recurring)
    
class TrialFinishCondition(NotificationCondition):
    def __init__(self, id, trial_id, exp_id):
        self.key = 'User Trial Done'
        self.content = None
        self.trial_id = trial_id
        super().__init__(id, exp_id)
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if is_user and trial.id==self.trial_id:
            # if total_brackets is not None:
            #     self.content = f'Trial {total_brackets - trial.bracket_id}-{trial.round_id + 1}-{trial.trial_id + 1} ({trial.metric:.3f})'
            # else:
            self.content = f'User Trial ID: {trial.id[:3]} ({trial.metric:.3f})'
            return True
        return False

    def emit(self, cond_id, status):
        print("emit trial finish", self.key)
        return  NOTIFICATION(TRIAL_FINISH, cond_id, status, self.key, self.content, self.exp_id).to_json()
        # noti = NOTIFICATION(TRIAL_FINISH, cond_id, status, trial.id, trial.metric, self.key).to_json()
        # return noti
    def to_json(self):
        return dict(type=TRIAL_FINISH, id=self.id, trialId=self.trial_id)
       
class BracketFinishCondition(NotificationCondition):
    def __init__(self, id, bracket_id, exp_id, bracket_length=3):
        self.key = f'Bracket Done'
        self.content = f'Bracket ID: {bracket_length - bracket_id}'
        self.timeout_key = f'Bracket {bracket_length - bracket_id} Done'
        self.bracket_id = bracket_id
        super().__init__(id, exp_id)
    # def test(self, bracket_id):
    #     return bracket_id==self.bracket_id
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        return round==None and bracket==self.bracket_id
    
    def emit(self, cond_id, status):

        return NOTIFICATION(BRACKET_FINISH, cond_id, status, self.key, self.content, self.exp_id).to_json()
    # def emit(self, cond_id, status, trial):
    #     noti = NOTIFICATION(BRACKET_FINISH, cond_id, status, bracket_id=self.bracket_id, display=self.key).to_json()
    #     return noti
    
    def to_json(self):
        return dict(type=BRACKET_FINISH, id=self.id, bracketId=self.bracket_id)
class RoundFinishCondition(NotificationCondition):
    def __init__(self, id, bracket_id, round_id, exp_id, bracket_length=3):
        super().__init__(id, exp_id)
        # self.key = f'Round {bracket_id}-{round_id} Done'
        self.key = "Round Done"
        self.content = f'Round ID: {bracket_length - bracket_id}-{round_id+1}'
        self.timeout_key = f'Round {bracket_length - bracket_id}-{round_id+1} Done'
        self.round_id = round_id
        self.bracket_id = bracket_id
    
    # def test(self, bracket_id, round_id):
    #     return bracket_id==self.bracket_id and round_id==self.round_id
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        return bracket==self.bracket_id and round==self.round_id
    
    def emit(self, cond_id, status):
        return NOTIFICATION(ROUND_FINISH, cond_id, status, self.key, self.content, self.exp_id).to_json()
    # def emit(self, cond_id, status, trial):
    #     noti = NOTIFICATION(ROUND_FINISH, cond_id, status,bracket_id=self.bracket_id, round_id=self.round_id, display=self.key).to_json()
    #     return noti
    def to_json(self):
        return dict(type=ROUND_FINISH, id=self.id, bracketId=self.bracket_id,  roundId=self.round_id)



# Argument: time

class TimeoutCondition(NotificationCondition):
    def __init__(self, id, time, exp_id):
        self.key = f'Timeout'
        self.content = None
        self.time = datetime.fromtimestamp(time)
        super().__init__(id, exp_id)

    def test(self):
        return datetime.now() > self.time
    
    def emit(self, cond_id, status, event_cond):
        self.content = f'{event_cond.timeout_key} Timeout'
        return NOTIFICATION(TIMEOUT, cond_id, status, self.key, self.content, self.exp_id).to_json()
        # return NOTIFICATION(LOW_UTILIZATION, cond_id, status, self.key, self.content).to_json()
    

    def to_json(self):
        return dict(type=TIMEOUT, id=self.id ,time=self.time.timestamp())


# Argument: utilization, temperature

class LowUtilizationCondition(NotificationCondition):
    def __init__(self, id, utilization=3, exp_id = None):
        self.key = "Low GPU Utilization"
        self.content = None
        self.last_noti = None
        self.utilization = utilization
        super().__init__(id, exp_id)

    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if utilization is None or self.last_noti and datetime.now().timestamp() - self.last_noti < 600:
            return False
        if utilization < self.utilization:
            self.content = f'{utilization:.2f}%'
            return True
        return False
    
    def emit(self, cond_id, status):
        self.last_noti = datetime.now().timestamp()
        return NOTIFICATION(LOW_UTILIZATION, cond_id, status, self.key, self.content, self.exp_id).to_json()

    def to_json(self):
        return dict(type=LOW_UTILIZATION, id=self.id)
    
class HighTemperatureCondition(NotificationCondition):
    def __init__(self, id, temperature=70, exp_id = None):
        self.key = "High GPU Temperature"
        self.content = None
        self.temperature = temperature
        self.last_noti = None
        super().__init__(id, exp_id)
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if temperature is None or self.last_noti and datetime.now().timestamp() - self.last_noti < 600:
            return False
        if temperature > self.temperature:
            # self.key = f'High GPU Temperature: {int(temperature)}°C'
            self.content = f'{int(temperature)}°C'

            return True
        return False

    def emit(self, cond_id, status):
        self.last_noti = datetime.now().timestamp()
        return NOTIFICATION(HIGH_TEMPERATURE, cond_id, status, self.key, self.content, self.exp_id).to_json()
    def to_json(self):
        return dict(type=HIGH_TEMPERATURE, id=self.id)
    
    


class ExceptionHappenCondition(NotificationCondition):
    def __init__(self, id, exp_id):
        self.key = "Exception Happened"
        super().__init__(id, exp_id)

    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if exception:
            # self.key = f'Exception Happened: {str(exception)}'
            self.content = f'{str(exception)}'
            return True
        return False
    
    def emit(self, cond_id, status):
        return NOTIFICATION(EXCEPTION_HAPPEN, cond_id, status, self.key, self.content, self.exp_id).to_json()
    
    def to_json(self):
        return dict(type=EXCEPTION_HAPPEN, id=self.id)
    

class HigUsageCondition(NotificationCondition):
    def __init__(self, id, usage=70, exp_id = None):
        self.key = "High Disk Usage"
        self.content = None
        self.usage = usage
        self.last_noti = None
        super().__init__(id, exp_id)
    def test(self, is_user, trial, round, bracket, prog_type, utilization, temperature, exception, disk_usage, total_brackets=None):
        if disk_usage is None or self.last_noti and datetime.now().timestamp() - self.last_noti < 600:
            return False
        if disk_usage > self.usage:
            self.content = f'{int(disk_usage)}%'

            return True
        return False

    def emit(self, cond_id, status):
        self.last_noti = datetime.now().timestamp()
        return NOTIFICATION(HIGH_USAGE, cond_id, status, self.key, self.content, self.exp_id).to_json()
    def to_json(self):
        return dict(type=HIGH_USAGE, id=self.id)