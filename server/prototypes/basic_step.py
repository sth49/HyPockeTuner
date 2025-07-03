from bohb.bohb import BOHB
from bohb.state import STATE
import bohb.configspace as cs


def objective(step, alpha, beta):
    return 1 / (alpha * step + 0.1) + beta


def evaluate(params, n_iterations):
    loss = 0.0
    for i in range(int(n_iterations)):
        loss += objective(**params, step=i)
    return loss/n_iterations


alpha = cs.CategoricalHyperparameter('alpha', [0.001, 0.01, 0.1])
beta = cs.CategoricalHyperparameter('beta', [1, 2, 3])
configspace = cs.ConfigurationSpace([alpha, beta], seed=123)

def callback(event_type, params):
    print(event_type, params)
    
opt = BOHB(configspace, evaluate, max_budget=81, min_budget=1)
state = STATE(configspace, evaluate, max_budget=81, min_budget=1, callback=callback)
# for s in reversed(range(state.s_max+1)):
#     state.update_s(s)
#     for i in range(s+1):
#         state.update_i(i)
#         for j in range(state.n):
#             opt = BOHB(state)
#             opt.step(s, i, j)
#         state.after_j()
flag = True
i = 0
while True:
    # print(i)
    state, sample = opt.step(state)
    loss = opt.evaluating(state, sample.to_dict())
    state  = opt.done(state, sample, loss)
    # if i==10:
    #     trial_alpha = cs.CategoricalHyperparameter('alpha', [0.1])
    #     trial_beta = cs.CategoricalHyperparameter('beta', [0.9])
    #     trial_configspace = cs.ConfigurationSpace([trial_alpha, trial_beta], seed=123)
    #     trial = trial_configspace.sample_configuration()
    #     state = opt.add_trials(trial, state)
    # if i==5:
    #     state = opt.narrow_configspace('alpha', 0.1, state)
    #     state = opt.narrow_configspace('alpha', 0.1, state)
    i+=1
