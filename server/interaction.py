from datetime import datetime

class Interaction:
    def __init__(self, data, interaction):
        self.time = datetime.now().timestamp()
        self.interaction = interaction
        self.data = data

    def to_dict(self):
        return {
            "time": self.time,
            "type": self.interaction,
            "data": self.data
        }
