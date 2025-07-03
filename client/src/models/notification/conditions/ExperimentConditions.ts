import { BaseNotiCond } from "./BaseNotiCond";
import { NotiType } from "../notification.types";

export class ExperimentStartCond extends BaseNotiCond {
  name = "experimentStart";
  type = NotiType.EXPERIMENT_START;

  toString(): string {
    return "Experiment Started";
  }
}

export class ExperimentPauseCond extends BaseNotiCond {
  name = "experimentPause";
  type = NotiType.EXPERIMENT_PAUSE;

  toString(): string {
    return "Experiment Paused";
  }
}

export class ExperimentResumeCond extends BaseNotiCond {
  name = "experimentResume";
  type = NotiType.EXPERIMENT_RESUME;

  toString(): string {
    return "Experiment Resumed";
  }
}

export class ExperimentFinishCond extends BaseNotiCond {
  name = "experimentFinish";
  type = NotiType.EXPERIMENT_FINISH;

  toString(): string {
    return "Experiment Done";
  }
}
