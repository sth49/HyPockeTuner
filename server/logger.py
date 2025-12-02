import pandas as pd
from datetime import datetime
import os

from exp import Exp

LOG_PATH = "./log/"

class Logger:
    def __init__(self, log_path=LOG_PATH):
        time = datetime.now()
        self.path = os.path.join(log_path, f"{time.year}-{time.month}-{time.day}-{time.hour}-{time.minute}-{time.second}")
        self.page = None
        self.visibility = None
        
        if not os.path.exists(self.path):
            os.mkdir(self.path)
        
        # self.fp = open(os.path.join(self.path, "log.txt"), "a")
        # self.log_df = pd.DataFrame(columns=['Timestamp', 'Direction', 'Event', 'Data'])
        # self.log_df = pd.DataFrame(columns=['Timestamp', 'IP', 'User_ID', 'Curr_Exp', 'Curr_Exp_Progress', 'Curr_Exp_Best', 'Client_Exp', 'Data'])
        # self.log_df = pd.DataFrame(columns=['Timestamp', 'Event', 'IP', 'User_ID', 'Curr_Exp', 'Curr_Exp_Status', 'Curr_Exp_Progress', 'Curr_Exp_Best', 'Client_Exp', 'Client_Exp_Status', 'Client_Exp_Progress', 'Client_Exp_Best', 'Event_data'])
        self.log_df = pd.DataFrame(columns=['Timestamp', 'IP', 'User_ID','Event', 'Page', 'Visibility', 'Curr_Exp', 'Curr_Exp_Status', 'Curr_Exp_Progress', 'Curr_Exp_Best', 'Client_Exp', 'Client_Exp_Status', 'Client_Exp_Progress', 'Client_Exp_Best', 'Event_data'])

    def close_log_file(self):
        pass
        # self.log_df.to_csv(os.path.join(self.path, "log.csv"), index=False)

    def log(self,event_name, ip=None, user_id=None, curr_exp=None, client_exp=None, data=None):
        # print()
        # print()
        # print()
        # print("Logging", event_name, ip, user_id, curr_exp, client_exp, data)
        if (event_name) == "page_changed":
            self.page = data
        elif (event_name) == "visibility_changed":
            self.visibility = data
        try:
            time = datetime.now()
            if curr_exp is not None and isinstance(curr_exp, Exp):
                curr_exp = curr_exp.summary()
                curr_exp_id = curr_exp['id']
                curr_exp_status = curr_exp['status']
                total = curr_exp['allTrials']
                done = curr_exp['doneTrials']
                curr_exp_progress = f'{done}/{total} ({done/total*100:.2f}%)'
                curr_exp_best = curr_exp['bestTrial']
                # print("Curr_exp_log", curr_exp, curr_exp_status, curr_exp_progress, curr_exp_best)
                
            else:
                curr_exp_id = None
                curr_exp_status = None
                curr_exp_progress = None
                curr_exp_best = None

            if client_exp is not None and not isinstance(curr_exp, str):
                client_exp = client_exp.summary()
                # print("Client_exp", client_exp)
                client_exp_id = client_exp['id']
                client_exp_status = client_exp['status']
                total = client_exp['allTrials']
                done = client_exp['doneTrials']
                client_exp_progress = f'{done}/{total} ({done/total*100:.2f}%)'
                client_exp_best = client_exp['bestTrial']   
                # print("Client_exp_log", client_exp, client_exp_status, client_exp_progress, client_exp_best)
            else:
                client_exp_id = None
                client_exp_status = None
                client_exp_progress = None
                client_exp_best = None


            log_entry = {
                "Timestamp": str(time),
                "User_ID": user_id,
                "IP": ip,
                "Event": event_name,
                "Page": self.page,
                "Visibility": self.visibility,
                "Curr_Exp": curr_exp_id,
                "Curr_Exp_Status": curr_exp_status,
                "Curr_Exp_Progress": curr_exp_progress,
                "Curr_Exp_Best": curr_exp_best,
                "Client_Exp": client_exp_id,
                "Client_Exp_Status": client_exp_status,
                "Client_Exp_Progress": client_exp_progress,
                "Client_Exp_Best": client_exp_best,
                'Event_data': str(data)
            }
            # log_entry = {
            #     'Timestamp': str(time),
            #     'Direction': direction,
            #     'Event': event_name,
            #     'Data': str(data)
            # }

            # log_entry_str = f"{str(time)},{str(direction)},{event_name},{str(data)}"
            log_entry_str = f"{str(time)},{event_name},{ip},{user_id},{curr_exp},{curr_exp_status},{curr_exp_progress},{curr_exp_best},{client_exp},{client_exp_status},{client_exp_progress},{client_exp_best},{str(data)}"
            self.log_df = pd.concat([self.log_df, pd.DataFrame([log_entry])], ignore_index=True)
            self.log_df.to_csv(os.path.join(self.path, "log.csv"), index=False)

            
            # print(log_entry_str)
            # self.fp.write(log_entry_str + "\n")
            

        except Exception as e:
            print("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")
            print(f"Error while logging: {str(e)}")
            print("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++")

        finally:
            self.close_log_file()

if __name__ == "__main__":
    logger = Logger()

    for _ in range(200):
        logger.log("abc", "event_name", {"a": 1})
