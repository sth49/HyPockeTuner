import requests
from multiprocessing import Process, Pipe
from urllib3.util.retry import Retry

from requests.adapters import HTTPAdapter
import json
# API = "http://0.0.0.0:8999/"
API = "https://115.145.171.130:3000/"
import time
import urllib3
from kernels import * 
import multiprocessing as mp
session = requests.Session()
retry = Retry(connect=3, backoff_factor=0.5)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)



urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def get_first_trial():
    res = requests.get(API + 'trials/first', verify=False).json()

    if not res['success']:
        return None

    return res['trial']

def register_trial():
    res = requests.get(API + 'trials/register', verify=False).json()
    print(res)
    return res['data']

    
def check_trial_alive(trial_id):
    res = requests.get(API + 'trials/check', verify=False, params={'trial_id': trial_id}).json()
    return res['alive']

def report_trial(ret):
    print("reporting", ret)
    res = requests.get(API + f'trials/report/{round(ret["loss"], 5)}/{round(ret["metric"],5)}', verify=False).json()
    return res['success']

def report_error(e):
    err_msg = str(e)
    err_msg = err_msg.split(".")[0]
    response = requests.post(API + f'trials/report/error', json={"error": err_msg}, verify=False)
    print(response.status_code)
    print(response.text)
    return response.status_code == 200


def get_is_paused(data):
    res = requests.get(API + f'trials/paused/{data["curr_exp"]}', verify=False).json()
    return res['paused']

def trial_restored(data):
    res = requests.post(API + 'trials/restore',json= data, verify=False).json()

def run(conn, trial):
    try:
        kernel = KernelBase(trial)    
        ret = kernel.run()

        conn.send(ret)
        conn.close()
    except Exception as e:
        print(e)
        conn.send(e)
        conn.close()
        
    

def main():
    mp.set_start_method('spawn')
    p, trial = None, None

    while True:
        if p is None:
            try:
                istrial = get_first_trial()
                # istrial = True
                # print("istrial", istrial)
                if istrial is not None:
                    print("Curr trial is: ", istrial)
                if istrial:                
                    trial = None
                    while trial is None:
                        try:
                            trial = register_trial()
                            print("Registered trial: ", trial)
                            # trial = {
                            #     "params":{
                            #         "batch_size": 64,
                            #         "optimizer": "adam", 
                            #         "momentum": 0.7414670522347097,
                            #         "learning_rate": 2e-5,
                            #         "activation": "silu",
                            #         "weight_decay": 0,
                            #         "scheduler": "linear_warmup",
                            #         "max_length": 128,
                            #         "dropout_probability": 0.1,
                            #         "position_embedding": "absolute",
                            #         "classifier_dropout": 0.1,
                            #     },
                            #     "budget": 3,
                            #     "model": "bert",
                            #     "dataset":"korean_hate_speech",
                            # }
                            # trial = {'success': True, 'data': {'params': {'batch_size': 32, 'optimizer': 'sgd', 'momentum': 0.7414670522347097, 'learning_rate': 0.0001, 'activation': 'softmax', 'weight_decay': 0, 'encoder': 'dpn', 'loss': 'mse', 'scheduler': 'None', 'pretrained': True}, 'budget': 1, 'model': 'unet', 'dataset': 'satellite'}}
                            

                        except Exception as e:
                            print("Failed to register. Retrying...")
                            time.sleep(5)
                    parent_conn, child_conn = Pipe()
                    p = Process(target=run, args=(child_conn, trial))
                    p.start()
            except Exception as e:
                print("error: ", e)
                print("Failed to get a task from the queue. Retrying...")

        if p is not None:
            # print("Checking..")
            res = get_is_paused(trial)

            if res:
                print("Paused")
                p.terminate()
                p.join()
                print("process terminated")
                p = None
                trial_restored(trial)
                continue

            p.join(5)
        else:
            time.sleep(1)

        if p and p.exitcode is not None:
            # done
            ret = parent_conn.recv()
            # print("return ", ret)
            report = False
            if isinstance(ret, Exception):
                print("Error during execution. Skipping the result")
                report = report_error(ret)

            else:
                
                while not report:
                    try:
                        report = report_trial(ret)
                    except Exception as e:
                        print("Error during reporting. Retrying...")
                        time.sleep(5)
                
            # try:
            #     report_trial(ret)
            # except Exception as e:
            #     print("Error during reporting. Skipping the result")
            p = None


if __name__=="__main__":
    print("Starting worker...")
    main()
    # trial = {
    #         "params":{
    #             "learning_rate": 2e-5, 
    #             "optimizer": "adam", # 확인
    #             "scheduler": "linear_warmup", # 확인
    #             "batch_size": 64, # 
    #             "weight_decay": 0,
    #             "momentum": 0.7414670522347097,
    #             "activation": "silu", # 확인
    #             "max_length": 500,
    #             "dropout_p": 0.1,
    #             "positional_embedding": "absolute", # 확인
    #             "use_decoder": False, # 확인
    #         },
    #         "budget": 3,
    #         "model": "bert",
    #         "dataset":"korean_hate_speech",
    #     }

    # kernel = KernelBase(trial)
    # ret = kernel.run()
    # for lr in [1e-4, 1e-3, 1e-2, 1e-1]:
    #     print("########### learning rate: ", lr)
    #     trial2 = trial.copy()
    #     trial2['params']['learning_rate'] = lr
    #     kernel = KernelBase(trial2)    
    #     ret = kernel.run()
    #     print()
    #     print()
   
    
    # for bs in [16, 32, 64, 128, 256]:
    #     print("########### batch size: ", bs)
    #     trial2 = trial.copy()
    #     trial2['params']['batch_size'] = bs
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for wd in [0, 0.1, 0.01, 0.001, 0.0001]:
    #     print("########### weight decay: ", wd)
    #     trial2 = trial.copy()
    #     trial2['params']['weight_decay'] = wd
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for mom in [0, 0.1, 0.5, 0.9, 0.99]:
    #     print("########### momentum: ", mom)
    #     trial2 = trial.copy()
    #     trial2['params']['momentum'] = mom
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()

     # for opt in [
    #       "adam", # 성공
    #       "adamw", # 성공
    #       "adafactor", # 성공
    #       "adamax", # 성공
    #       "asgd", # 성공
    #       "rprop", # 성공
    #       "nadam", # 성공 
    #       "radam", # 성공
    #       "sgd", # 성공
    #       "rms" # 성공
    #     ]:
    #     print("########### optimizer: ", opt)
    #     trial2 = trial.copy()
    #     trial2['params']['optimizer'] = opt
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for sch in [
    #     "constant", # 성공
    #       "constant_warmup", # 성공
    #       "cosine_warmup", # 성공
    #       "cosine_hard_restarts", # 성공
    #       "linear_warmup", # 성공
    #       "polynomial_decay", #  성공
    #       "none" # 성공
    #     ]:
    #     print("########### scheduler: ", sch)
    #     trial2 = trial.copy()
    #     trial2['params']['scheduler'] = sch
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for act in ["gelu", "relu", "silu", "gelu_new"]:
    #     print("########### activation: ", act)
    #     trial2 = trial.copy()
    #     trial2['params']['activation'] = act
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for embed_type in ["absolute", "relative_key", "relative_key_query"]:
    #     print("########### position_embedding_type: ", embed_type)
    #     trial2 = trial.copy()
    #     trial2['params']['position_embedding_type'] = embed_type
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for is_decoder in [True,  False]:
    #     print("########### is_decoder: ", is_decoder)
    #     trial2 = trial.copy()
    #     trial2['params']['is_decoder'] = is_decoder
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    # for max_len in [64, 128, 256, 512, 1024]:
    #     print("########### max_length: ", max_len)
    #     trial2 = trial.copy()
    #     trial2['params']['max_length'] = max_len
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()