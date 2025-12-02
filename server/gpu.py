import subprocess
import time
from datetime import datetime

def get_gpu_usage(device_id=0):
    """
    Get GPU memory usage, volatile GPU utilization, and temperature for a specific GPU device.
    :param device_id: ID of the GPU device. Default is 0.
    :return: Used memory, total memory in MB, volatile GPU utilization in %, and temperature in Celsius.
    """
    result = subprocess.check_output(['nvidia-smi', '--query-gpu=memory.used,memory.total,utilization.gpu,temperature.gpu', '--format=csv,nounits,noheader']).decode('utf-8')
    print(f"nvidia-smi output: {result}")
    
    
    results = [x.strip() for x in result.split('\n') if x]
    used_memory, total_memory, gpu_utilization, temperature = map(int, results[device_id].split(','))
    return used_memory, total_memory, gpu_utilization, temperature

if __name__ == "__main__":
    while True:
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        used, total, util, temp = get_gpu_usage()
        print(f"[{current_time}] Used memory: {used}MB, Total memory: {total}MB, GPU Utilization: {util}%, Temperature: {temp}°C")
        time.sleep(1)
