import requests
from multiprocessing import Process, Pipe, Queue
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
import time
import urllib3
import os
from kernels import get_kernel_for_trial, load_kernel
import multiprocessing as mp

# API URL - configure via environment variable or use default
API = os.environ.get("WORKER_API_URL", "http://localhost:8080/")

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
    print("reporting trial", ret)
    res = requests.get(API + f'trials/report/result/{round(ret["loss"], 5)}/{round(ret["metric"],5)}', verify=False).json()
    return res['success']

def report_progress(ret):
    print("reporting progress", ret)
    res = requests.get(API + f'trials/report/progress/{int(ret["current"])}/{int(ret["total"])}', verify=False).json()
    return res['success']

def report_error(e):
    err_msg = str(e)
    err_msg = err_msg.split(".")[0]
    response = requests.post(API + f'trials/report/error', json={"error": err_msg}, verify=False)
    print(response.status_code)
    print(response.text)
    return response.status_code == 200

def get_is_paused(data):
    try:
        res = requests.get(API + f'trials/paused/{data["curr_exp"]}', verify=False).json()
        return res['paused']
    except Exception as e:
        print(f"Error checking pause status: {e}")
        return False

# def trial_restored(data):
#     print("Restoring trial: ", data)
#     try:

#         response = requests.get(API + f'trials/restore/{data["curr_exp"]}', verify=False)
#         if response.status_code == 200 and response.text.strip():
#             res = response.json()
#             return res.get('success', False)
#         else:
#             print(f"Restore failed: {response.status_code}, {response.text}")
#             return False
#     except Exception as e:
#         print(f"Error restoring trial: {e}")
#         return False

def train_process(queue, trial):
    try:
        # Dynamically select and load the appropriate kernel
        kernel_name = get_kernel_for_trial(trial)
        KernelClass = load_kernel(kernel_name)
        
        print(f"Using kernel: {kernel_name} for model='{trial.get('model')}', dataset='{trial.get('dataset')}'")
        
        kernel = KernelClass(trial, queue)
        kernel.run()
    except Exception as e:
        print(f"Error in train_process: {e}")
        queue.put(('error', e))

def main():
    mp.set_start_method('spawn')
    p, trial = None, None
    last_pause_check = 0
    PAUSE_CHECK_INTERVAL = 2
    
    while True:
        if p is None:
            try:
                istrial = get_first_trial()
                if istrial is not None:
                    print("Curr trial is: ", istrial)
                if istrial:                
                    trial = None
                    while trial is None:
                        try:
                            trial = register_trial()
                            print("Registered trial: ", trial)
                        except Exception as e:
                            print("Failed to register. Retrying...")
                            time.sleep(5)
                    queue = Queue()
                    p = Process(target=train_process, args=(queue, trial))
                    p.start()
                    last_pause_check = time.time()
            except Exception as e:
                print("error: ", e)
                print("Failed to get a task from the queue. Retrying...")

        if p is not None:
            
            current_time = time.time()
            if current_time - last_pause_check > PAUSE_CHECK_INTERVAL:
                try:
                    is_paused = get_is_paused(trial)
                    if is_paused:
                        print("Experiment Paused!")
                        p.terminate()
                        p.join(timeout=10)
                        if p.is_alive():
                            print("Process still alive after terminate, using kill")
                            p.kill()
                        print("Process terminated")
                        
                        
                        # restore_success = trial_restored(trial)
                        # if restore_success:
                        #     print("Trial restored successfully")
                        # else:
                        #     print("Trial restoration failed")
                        
                        p = None
                        trial = None
                        continue
                except Exception as e:
                    print(f"Error during pause check: {e}")
                
                last_pause_check = current_time
            
            
            process_completed = False
            error_reported = False
            while not queue.empty():
                try:
                    message = queue.get_nowait()
                    print(f"Processing message: {message[0]}")
                    
                    if message[0] == 'progress':
                        report_progress(message[1])
                    elif message[0] == 'done':
                        ret = message[1]
                        report_trial(ret)
                        process_completed = True
                    elif message[0] == 'error' and not error_reported:
                        error_msg = message[1]
                        report_error(error_msg)
                        error_reported = True
                        process_completed = True
                    elif message[0] == 'error' and error_reported:
                        print(f"Duplicate error message ignored: {message[1]}")
                except Exception as e:
                    print(f"Error processing queue message: {e}")
                    break

            
            if not p.is_alive() or process_completed:
                try:
                    p.join(timeout=5)
                except:
                    pass
                p = None
                trial = None
                print("Process completed, ready for next trial")

        else:
            time.sleep(1)

if __name__=="__main__":
    print("Starting worker...")
    main()
    # trial = {
    #         "params":{
    #             "learning_rate": 2e-5, 
    
    
    #             "batch_size": 64, # 
    #             "weight_decay": 0,
    #             "momentum": 0.7414670522347097,
    
    #             "max_length": 500,
    #             "dropout_p": 0.1,
    
    
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
    
    
    
    
    
    
    
    
    
    
    #     ]:
    #     print("########### optimizer: ", opt)
    #     trial2 = trial.copy()
    #     trial2['params']['optimizer'] = opt
    #     kernel = KernelBase(trial2)
    #     ret = kernel.run()
    #     print()
    #     print()
    # for sch in [
    
    
    
    
    
    
    
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