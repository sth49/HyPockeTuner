import json
# import pickle
import dill as pickle
import os
from os.path import join, exists
import bohb.configspace as cs
import shutil
from bohb import BOHB
from bohb.state import STATE
import uuid
from datetime import datetime
from queue import PriorityQueue
import numpy as np
from notification import ConditionPair
from hparam_set import HParamSet

from interaction import Interaction
STATE_FILE = "exp.pickle"
CONFIG_FILE = "config.json"
SEED = 123
abc  =5

EXP_PENDING = "pending"
EXP_RUNNING = "running"
EXP_FINISED = "finished"
EXP_RESERVED = "reserved"
# EXP_STOPPED = "stopped"
EXP_PAUSED = "paused"   
EXP_AUTO_PAUSED = "auto_paused"

def parse_clip_config(config, seed, id=None):
    """Parse configuration for CLIP model"""
    from bohb.bohb import BOHB
    import bohb.configspace as cs
    
    # Create hyperparameters based on config
    hyperparams = []
    
    for hparam in config['hyperparameters']:
        name = hparam['name']
        
        if hparam['type'] == 'uniform':
            hp = cs.UniformHyperparameter(
                name, hparam['range'][0], hparam['range'][1]
            )
        elif hparam['type'] in ['ordinal', 'ordered']:
            hp = cs.OrderedHyperparameter(name, hparam['values'])
        elif hparam['type'] == 'unordered':
            hp = cs.UnorderedHyperparameter(name, hparam['values'])
        else:
            raise ValueError(f"Unknown hyperparameter type: {hparam['type']}")
        
        hyperparams.append(hp)
    
    # Create configuration space
    configspace = cs.ConfigurationSpace(hyperparams, seed=seed)
    
    # Create BOHB state and optimizer (using same pattern as original code)
    state = STATE(
        configspace, 
        max_budget=config['bohb']['max_budget'], 
        min_budget=config['bohb']['min_budget'], 
        eta=config['bohb']['eta'],
        id=id
    )
    
    opt = BOHB(
        configspace=configspace,
        min_budget=config['bohb']['min_budget'],
        max_budget=config['bohb']['max_budget'],
        eta=config['bohb']['eta']
    )
    
    # Process notification conditions (same as in parse_config)
    for cond in config.get('cond_list', []):
        state.add_cond(cond)
    
    return configspace, state, config, opt

def parse_config(path, seed, id=None):
    np.random.seed(seed)    
    config = json.load(open(path, encoding="utf-8"))
    
    # Check if this is a CLIP model configuration
    if config.get('model') == 'clip':
        return parse_clip_config(config, seed, id)
    
    # Original logic for other models
    # Initialize all JSON variables to None
    batch_size_json = None
    optimizer_json = None  
    momentum_json = None
    hidden_size_json = None
    scheduler_p_json = None
    learning_rate_json = None
    activation_json = None
    regularization_p_json = None
    weight_decay_json = None
    loss_json = None
    encoder_json = None
    scheduler_json = None
    pretrained_json = None
    positional_embedding_json = None
    dropout_p_json = None
    classifier_dropout_json = None
    eps_json = None
    warmup_ratio_json = None
    scheduler_type_json = None
    gradient_clip_norm_json = None
    dropout_rate_json = None
    temperature_init_json = None

    for hparam in config['hyperparameters']:
        print(hparam['name'])
        if hparam['name'] == 'batch_size':
            batch_size_json = hparam
        elif hparam['name'] == 'optimizer':
            optimizer_json = hparam
        elif hparam['name'] == 'optimizer_type':  # For CLIP
            optimizer_json = hparam
        elif hparam['name'] == 'momentum':
            momentum_json = hparam
        elif hparam['name'] == 'hidden_size':
            hidden_size_json = hparam
        elif hparam['name'] == 'scheduler_p':
            scheduler_p_json = hparam
        elif hparam['name'] == 'learning_rate':
            learning_rate_json = hparam
        elif hparam['name'] == 'activation':
            activation_json = hparam
        elif hparam['name'] == 'regularization_p':
            regularization_p_json = hparam
        elif hparam['name'] == 'weight_decay':
            weight_decay_json = hparam
        elif hparam['name'] == "loss_function":
            loss_json = hparam
        elif hparam['name'] == "encoder":
            encoder_json = hparam
        elif hparam['name'] == "scheduler":
            scheduler_json = hparam
        elif hparam['name'] == "pretrained":
            pretrained_json = hparam
        elif hparam['name'] == "positional_embedding":
            positional_embedding_json = hparam
        elif hparam['name'] == "dropout_probability":
            dropout_p_json = hparam
        elif hparam['name'] == "classifier_dropout":
            classifier_dropout_json = hparam
        elif hparam['name'] == "eps":  # For CLIP
            eps_json = hparam
        elif hparam['name'] == "warmup_ratio":  # For CLIP
            warmup_ratio_json = hparam
        elif hparam['name'] == "scheduler_type":  # For CLIP
            scheduler_type_json = hparam
        elif hparam['name'] == "gradient_clip_norm":  # For CLIP
            gradient_clip_norm_json = hparam
        elif hparam['name'] == "dropout_rate":  # For CLIP
            dropout_rate_json = hparam
        elif hparam['name'] == "temperature_init":  # For CLIP
            temperature_init_json = hparam

        
    if batch_size_json['type'] == 'uniform':
        batch_size = cs.IntegerUniformHyperparameter(
            'batch_size', batch_size_json['range'][0], batch_size_json['range'][1], is_int=True)
    else:
        batch_size = cs.OrderedHyperparameter('batch_size', batch_size_json['values'])
    optimizer = cs.UnorderedHyperparameter('optimizer', optimizer_json['values'])
    
    if momentum_json and momentum_json['type'] == 'uniform':
        momentum = cs.UniformHyperparameter(
            'momentum', momentum_json['range'][0], momentum_json['range'][1], (optimizer=='sgd') | (optimizer=='rms'))
    elif momentum_json:
        momentum = cs.OrderedHyperparameter(
            'momentum', momentum_json['values'], (optimizer=='sgd') | (optimizer=='rms'))
    else:
        momentum = cs.UniformHyperparameter('momentum', 0.9, 0.9, (optimizer=='sgd') | (optimizer=='rms'))
    
    not_momentum = cs.UniformHyperparameter('momentum', 0, 0, ~momentum.cond)
        
    
    if learning_rate_json and learning_rate_json['type'] == 'uniform':
        learning_rate = cs.UniformHyperparameter(
            'learning_rate', learning_rate_json['range'][0], learning_rate_json['range'][1], log=True)
    elif learning_rate_json:
        learning_rate = cs.OrderedHyperparameter(
            'learning_rate', learning_rate_json['values'])
    else:
        learning_rate = cs.UniformHyperparameter('learning_rate', 1e-4, 1e-1, log=True)
        
    if activation_json:
        activation = cs.UnorderedHyperparameter('activation', activation_json['values'])
    else:
        activation = cs.UnorderedHyperparameter('activation', ['relu'])
    
    regularization_p = cs.UnorderedHyperparameter(
        'regularization_p', [False, True], dont_pass=True)
    if weight_decay_json and weight_decay_json['type'] == 'uniform':
        weight_decay = cs.UniformHyperparameter(
            'weight_decay', weight_decay_json['range'][0], weight_decay_json['range'][1], regularization_p == True)
    elif weight_decay_json:
        weight_decay = cs.OrderedHyperparameter(
            'weight_decay', weight_decay_json['values'], regularization_p == True)
    else:
        weight_decay = cs.UniformHyperparameter('weight_decay', 0, 1e-3, regularization_p == True)
    not_weight_decay = cs.UniformHyperparameter(
        'weight_decay', 0, 0, ~weight_decay.cond)
    
        
    if config.get('model') == 'ResNet18':
        if hidden_size_json and hidden_size_json['type'] == 'uniform':
            hidden_size = cs.IntegerUniformHyperparameter(
                'hidden_size', hidden_size_json['range'][0], hidden_size_json['range'][1], is_int=True)
        elif hidden_size_json:
            hidden_size = cs.OrderedHyperparameter(
                'hidden_size', hidden_size_json['values'])
        else:
            hidden_size = cs.IntegerUniformHyperparameter('hidden_size', 16, 64, is_int=True)
        
        if scheduler_p_json:
            scheduler_p = cs.UnorderedHyperparameter('scheduler_p', scheduler_p_json['values'])
        else:
            scheduler_p = cs.UnorderedHyperparameter('scheduler_p', [False, True])
        configspace = cs.ConfigurationSpace([batch_size, optimizer, hidden_size,
                                            scheduler_p, activation, weight_decay,
                                            not_momentum, not_weight_decay,
                                            regularization_p, momentum, learning_rate],
                                            seed=SEED)
    elif config.get('model') == 'unet':
        if encoder_json:
            encoder = cs.UnorderedHyperparameter('encoder', encoder_json['values'])
        else:
            encoder = cs.UnorderedHyperparameter('encoder', ['resnet34'])
        if loss_json:
            loss_fn = cs.UnorderedHyperparameter('loss_function', loss_json['values'])
        else:
            loss_fn = cs.UnorderedHyperparameter('loss_function', ['bce'])
        if scheduler_json:
            scheduler = cs.UnorderedHyperparameter('scheduler', scheduler_json['values'])
        else:
            scheduler = cs.UnorderedHyperparameter('scheduler', ['none'])
        if pretrained_json:
            pretrained = cs.UnorderedHyperparameter('pretrained', pretrained_json['values'])
        else:
            pretrained = cs.UnorderedHyperparameter('pretrained', [True])
        configspace = cs.ConfigurationSpace([batch_size, optimizer, 
                                         scheduler, weight_decay, activation,
                                         not_momentum, not_weight_decay,
                                         regularization_p, momentum, learning_rate, encoder, loss_fn, pretrained],
                                        seed=SEED)
        
    elif config.get('model') == "bert":
        # "learning_rate",
        # "optimizer",
        # "scheduler",
        # "batch_size",
        # "weight_decay",
        # "momentum",
        # "activation",
        # "positional_embedding",
        # "use_decoder",
        # "dropout_p",
        if scheduler_json:
            scheduler = cs.UnorderedHyperparameter('scheduler', scheduler_json['values'])
        else:
            scheduler = cs.UnorderedHyperparameter('scheduler', ['none'])
        
        if positional_embedding_json:
            positional_embedding = cs.UnorderedHyperparameter('positional_embedding', positional_embedding_json['values'])
        else:
            positional_embedding = cs.UnorderedHyperparameter('positional_embedding', ['absolute'])
        
        if dropout_p_json and dropout_p_json['type'] == 'uniform':
            dropout_p = cs.UniformHyperparameter(
                'dropout_probability', dropout_p_json['range'][0], dropout_p_json['range'][1])
        elif dropout_p_json:
            dropout_p = cs.OrderedHyperparameter(
                'dropout_probability', dropout_p_json['values'])
        else:
            dropout_p = cs.UniformHyperparameter('dropout_probability', 0.1, 0.5)
        
        if classifier_dropout_json and classifier_dropout_json['type'] == 'uniform':
            print("dropout range", classifier_dropout_json['range'])
            classifier_dropout = cs.UniformHyperparameter(
                'classifier_dropout', classifier_dropout_json['range'][0], classifier_dropout_json['range'][1])
        elif classifier_dropout_json:
            classifier_dropout = cs.OrderedHyperparameter(
                'classifier_dropout', classifier_dropout_json['values'])
        else:
            classifier_dropout = cs.UniformHyperparameter('classifier_dropout', 0.1, 0.5)
        
            
        configspace = cs.ConfigurationSpace([learning_rate,
                                             optimizer, scheduler, batch_size, weight_decay,
                                             momentum, activation, positional_embedding,
                                             dropout_p, classifier_dropout, not_momentum, not_weight_decay,
                                             regularization_p],
                                            seed=SEED)
    # if activation_json['type'] == 'uniform':
    #     activation = cs.UniformHyperparameter(
    #         'activation', activation_json['range'][0], activation_json['range'][1])
    # else:
    #     activation = cs.OrderedHyperparameter(
    #         'activation', activation_json['values'])
    else:
        if hidden_size_json and hidden_size_json['type'] == 'uniform':
            hidden_size = cs.IntegerUniformHyperparameter(
                'hidden_size', hidden_size_json['range'][0], hidden_size_json['range'][1], is_int=True)
        elif hidden_size_json:
            hidden_size = cs.OrderedHyperparameter(
                'hidden_size', hidden_size_json['values'])
        else:
            hidden_size = cs.IntegerUniformHyperparameter('hidden_size', 16, 64, is_int=True)
        
        if scheduler_p_json:
            scheduler_p = cs.UnorderedHyperparameter('scheduler_p', scheduler_p_json['values'])
        else:
            scheduler_p = cs.UnorderedHyperparameter('scheduler_p', [False, True])
        configspace = cs.ConfigurationSpace([batch_size, optimizer, hidden_size,
                                            scheduler_p, activation, weight_decay,
                                            not_momentum, not_weight_decay,
                                            regularization_p, momentum, learning_rate],
                                            seed=SEED)
    
    
    
    state = STATE(configspace, max_budget=config['bohb'].get('max_budget', 81), min_budget=config['bohb'].get('min_budget', 1), eta=config['bohb'].get('eta', 3) ,id=id)
    opt = BOHB(configspace, max_budget=config['bohb'].get('max_budget', 81), min_budget=config['bohb'].get('min_budget', 1), eta=config['bohb'].get('eta', 3))
    for cond in config['cond_list']:
        state.add_cond(cond)
    # last_viewed_state = config['last_viewed_state']
    # print("=====================================")
    # print(last_viewed_state)
    # print("=====================================")
    
    return configspace, state, config, opt

class Exp():
    def __init__(self, data, id=None, user=None):
        if id:
            self.load_from_id(user, id)
            return
        self.user = user
        self.id = str(uuid.uuid4())
        data["expId"] = self.id
        self.name = data["name"]
        self.model = data["model"]
        self.dataset = data["dataset"]
        self.metric = data["metric"]
        self.hparam_list = []
        self.hparam_set = None
        for hparam in data["hyperparameters"]:
            if hparam["selected"] == True:
                self.hparam_list.append(hparam["name"])
        self.budget = data["bohb"]["max_budget"]
        self.created_at = datetime.now().timestamp()
        self.start_time = None
        self.pause_time = None
        self.resume_time = None
        self.end_time = None
        self.exp_state = EXP_PENDING
        self.last_updated = self.created_at
        self.que = None
        # self.last_viewed_state = None

        print(self.hparam_list)
        self.root_path = os.path.join(f"./users/{self.user}/experiments", self.id)
        if exists(self.root_path):
            raise Exception("Experiment ID already exists")
        os.mkdir(self.root_path)
        self.config_path = join(self.root_path, CONFIG_FILE)
        self.state_path = join(self.root_path, STATE_FILE)
        with open(self.config_path, "w") as f:
            json.dump(data, f)

        self.interaction = []

        
    
    def start(self):
        self.start_time = datetime.now().timestamp()
        self.state.check_cond(prog_type="start")
        self.exp_state = EXP_RUNNING
        prior, self.que = self.state.experiment_init()
        self.que.put((prior, f"{self.id} end"))
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.state.add_callback("startTime", self.start_time) 
        self.state.add_callback("status", self.exp_state) 
        self.save()
    
    def restore_trial(self, trial_que, trial):
        print("[exp.py] restoring trial", trial_que, trial)
        # self.que.put(trial_que)
        trial.is_paused = True
        trial.end_time = datetime.now().timestamp()
        self.state.current_trial = trial
        self.last_updated = datetime.now().timestamp()
        print("[exp.py] current trial restore__________-----------------", self.state.current_trial)
        self.state.add_callback("trialPaused", trial.to_dict())
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        
        # return que

    def reserve(self):
        if self.start_time:
            self.exp_state = EXP_AUTO_PAUSED    
        else:
            self.exp_state = EXP_RESERVED
        self.state.add_callback("status", self.exp_state)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        return 
    
    def unreserve(self):
        if self.start_time:
            self.exp_state = EXP_PAUSED
        else:
            self.exp_state = EXP_PENDING
        self.state.add_callback("status", self.exp_state)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        return 
    
    def pause(self):
        # self.exp_state = EXP_STOPPED
        self.exp_state = EXP_PAUSED
        # self.end_time = datetime.now().timestamp()
        self.pause_time = datetime.now().timestamp()
        inter = Interaction({
            "expId": self.id,
            "pauseTime": self.pause_time,
        } , "experimentPause")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())
        self.state.check_cond(prog_type="pause")
        # self.state.check_cond(prog_type="cancel")
        # self.state.add_callback("endTime", self.end_time) 
        self.state.add_callback("pauseTime", self.pause_time)
        self.state.add_callback("status", self.exp_state)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        return
    
    def redefine(self, data):
        inter = Interaction(data, "redefineExperiment")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())
        self.save()
        return 
        

    def auto_pause(self):
        self.exp_state = EXP_AUTO_PAUSED
        self.pause_time = datetime.now().timestamp()
        inter = Interaction({
            "expId": self.id,
            "pauseTime": self.pause_time,
        } , "experimentPause")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        self.state.check_cond(prog_type="pause")
        self.state.add_callback("pauseTime", self.pause_time)
        self.state.add_callback("status", self.exp_state)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        return
        
    def resume(self):
        self.resume_time = datetime.now().timestamp()
        self.exp_state = EXP_RUNNING
        
        inter = Interaction({
            "expId": self.id,
            "resumeTime": self.resume_time,
        } , "experimentResume")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        self.state.check_cond(prog_type="resume")
        self.state.add_callback("resumeTime", self.resume_time)
        self.state.add_callback("status", self.exp_state)
       
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)

        self.save()
        return

    def end(self):
        self.end_time = datetime.now().timestamp()
        self.exp_state = EXP_FINISED
        self.state.current_trial_type = 'End'
        self.state.current_trial = None
        self.state.experiment_done()
        self.state.add_callback("endTime", self.end_time) 
        self.state.check_cond(prog_type="finish")
        self.state.add_callback("status", self.exp_state)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        
    def load(self):
        if exists(self.state_path):
            with open(self.state_path, "rb") as f:
                self.id, self.name, self.model, self.dataset, self.created_at, self.last_updated, self.start_time, self.pause_time, self.resume_time, self.end_time, self.exp_state, self.metric, self.hparam_list, self.budget, self.root_path, self.config_path, self.state_path, self.configspace, self.state, self.config, self.opt, self.hparam_set, self.que, self.interaction = pickle.load(f)
            return
        else:
            self.configspace, self.state, self.config, self.opt = parse_config(self.config_path, seed=SEED, id=self.id)
            self.last_updated = datetime.now().timestamp()
            self.hparam_set = HParamSet(self.configspace)
            self.state.add_callback("lastUpdated", self.last_updated)
            self.save()

    def load_from_id(self, user, id):
        with open(os.path.join(f'./users/{user}/experiments/{id}', STATE_FILE), "rb") as f:
            self.id, self.name, self.model, self.dataset, self.created_at, self.last_updated, self.start_time, self.pause_time, self.resume_time, self.end_time, self.exp_state, self.metric, self.hparam_list, self.budget, self.root_path, self.config_path, self.state_path, self.configspace, self.state, self.config, self.opt, self.hparam_set, self.que, self.interaction = pickle.load(f)
            print(self.state.noti_conds)
            return
    
    def add_user_trial(self, data):
        config = {}
        for hparam in data['config']:
            for h in self.state.configspace.hyperparameters:
                if h.name == hparam['name']:
                    if h.dont_pass:
                        pass
                    else:
                        config[hparam['name']] = hparam['value'][0]
        user_trial = {
            'exp_id': self.id,
            'id': data['id'],
            'iter': data['iter'],
            'config': config
            }
        inter = Interaction(user_trial, "add_user_trial")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())
        return user_trial
        
    def narrow_configspace(self, configs):
        inter = Interaction(configs, "narrow_configspace")
        print("=========== interaction type",inter.interaction)
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        for hparam in configs:
            self.state.configspace.narrow(hparam['name'], hparam['value'], hparam['lower'], hparam['upper'], hparam['mean'], hparam['sigma'])
        self.configspace = self.state.configspace
        self.state.add_callback("narrowConfigspace", configs)
        self.save()
        
    def add_condition(self, data):
        inter = Interaction(data, "add_condition")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        self.state.add_cond(data)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
    
    def edit_condition(self, data):
        inter = Interaction(data, "edit_condition")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        self.state.edit_cond(data)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()

    def remove_condition(self, data):
        inter = Interaction(data, "remove_condition")
        self.interaction.append(inter)
        self.state.add_callback("interaction", inter.to_dict())

        self.state.remove_cond(data)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()
        
    async def report_trial(self, trial, loss, metric, is_user_trial=False):
        if not is_user_trial:
            self.state = self.opt.done(self.state, loss, metric)
        
        trial.update_result(loss, metric)
        s = self.hparam_set.add(trial)
        trial.param_set_id = s['id']
        
        self.state.save_trial(trial)
        # self.state.check_cond(trial, is_user_trial)
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        self.save()

    def report_progress(self, trial, current, total):
        self.state.add_callback("progress", {
            "current": current,
            "total": total,
            "id": trial.id,
            "isUserTrial": trial.is_user_trial,
            "bracketId": trial.bracket_id,
            "roundId": trial.round_id,
            "trialId": trial.trial_id,
        })
        self.last_updated = datetime.now().timestamp()
        self.state.add_callback("lastUpdated", self.last_updated)
        # self.save()
        
    def report_error(self, trial, error, is_user_trial=False):
        if not is_user_trial:
            self.state = self.opt.error(self.state, 1e+3)
        trial.update_result("error", 0)
        self.state.save_trial(trial, True)
        self.state.check_cond(exception=error)
        self.last_updated = datetime.now().timestamp()
        self.save()
                
    def capture(self, last_viewed_state):
        self.config['lastViewedState'] = last_viewed_state
        self.save()


    def trials_for_shap(self):
        """SHAP 분석을 위한 trial 데이터 반환"""
        trials = self.state.get_trials()
        if not trials:
            return []
        
        shap_data = []
        for trial in trials:
            config = trial['config'].copy()
            # del config['id']  # id는 SHAP 분석에 필요하지 않으므로 제거
            if ('id' in config):
                del config['id']
            if ('bracket' in config):
                del config['bracket']
            if ('round' in config):
                del config['round']
            if ('index' in config):
                del config['index']
            config['metric'] = trial['metric']
            shap_data.append(config)
        print("ShapData for SHAP analysis:", shap_data)
        return shap_data
        
        
    def summary(self):
        return {
            "id": self.id,
            "name": self.name,
            "dataset": self.dataset,
            "model": self.model,
            "metric": self.metric['name'],
            "hparamList": self.hparam_list,
            "budget" : self.budget,
            "lastUpdatedAt": self.last_updated,
            "status": self.exp_state,
            "bestTrial": self.state.best_trial.to_dict() if self.state.best_trial else None,
            "allTrials": self.state.count,
            "doneTrials": len(self.state.done_trials)
        }
    def to_json(self):
        json_data = self.config.copy()
        json_data['id'] = self.id
        json_data['cond'] = [cond.to_json() for cond in self.state.noti_conds]
        json_data['totalTrials'] = self.state.count
        json_data['curNumTrials'] = len(self.state.done_trials)
        json_data['dataset'] = self.dataset
        json_data['model'] = self.model
        json_data['temp'] = self.metric
        json_data["lastUpdated"] = self.last_updated
        json_data['startTime'] = self.start_time
        json_data['endTime'] = self.end_time
        json_data["status"] = self.exp_state
        # json_data['lastViewedState'] = self.last_viewed_state
        if self.state.best_trial:
            json_data['bestTrial'] = self.state.best_trial.to_dict()
        if self.state.all_callbacks:
            json_data['allCallbacks'] = self.state.all_callbacks
        return json_data
            
    def reset(self):
        if exists(self.state_path):
            os.remove(self.state_path)
        self.load()
        
    def save(self):
        print("saving experiment")
        with open(self.state_path, "wb") as f:
            pickle.dump((self.id, self.name, self.model, self.dataset, self.created_at, self.last_updated, self.start_time, self.pause_time, self.resume_time, self.end_time, self.exp_state, self.metric, self.hparam_list, self.budget, self.root_path, self.config_path, self.state_path, self.configspace, self.state, self.config, self.opt, self.hparam_set, self.que,
                self.interaction
            ), f)
        return 