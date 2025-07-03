import datetime 
        



class HPOState:
    def __init__(self, id, progress, best_trial):
        self.exp_id = id
        self.progress = progress
        self.best_trial = best_trial
        self.captured_at = datetime.datetime.now().timestamp()
    def to_json(self):
        return dict(expId=self.exp_id, progress=self.progress, bestTrial=self.best_trial.to_dict(), capturedAt=self.captured_at)



class StateDiff:
    def __init__(self, prev_state:HPOState, curr_state:HPOState):
        self.prev_state = prev_state
        self.curr_state = curr_state
        
        
    def is_significant(self):
        # if the difference of captured timestamp is little, return false
        if self.prev_state == None or self.curr_state == None:
            print("====== state is None ======")
            return False
        if self.prev_state == None:
            print("====== prevState is None ======")
            return False
        
        if abs(self.prev_state.captured_at - self.curr_state.captured_at) < 10:
            print("====== too little difference ======")
            return False
        
        if self.prev_state.best_trial.metric != self.curr_state.best_trial.metric:
            print("====== best trial metric changed ======")
            print("prev metric", self.prev_state.best_trial.metric)
            print("curr metric", self.curr_state.best_trial.metric)
            return True
        if self.prev_state.progress != self.curr_state.progress:
            print("====== progress changed ======")
            print("prev progress", self.prev_state.progress)
            print("curr progress", self.curr_state.progress)
            return True
        print("====== no significant change ======")
        return False
    
    def to_json(self):
        return dict(prevState=self.prev_state.to_json(), currState=self.curr_state.to_json())
    
    @staticmethod
    def compute(prev_state:HPOState, curr_state:HPOState):
        return StateDiff(prev_state, curr_state) 
