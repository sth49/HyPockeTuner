import pandas as pd

import random
df = pd.read_csv('./data/satellite/train_edited.csv')
num_arr = [i for i in range(len(df))]
# smaple 
print(random.sample(num_arr, int(len(df)*0.2)))