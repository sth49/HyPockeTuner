import { BaseNotiCond } from "./BaseNotiCond";
import { format, getUnixTime } from "date-fns";
import { NotiType, NotiCondJSON } from "../notification.types";

import { useExperimentStore } from "../../../stores/experimentStore";

export class BracketFinishCond extends BaseNotiCond {
  name = "bracketFinish";
  type = NotiType.BRACKET_FINISH;

  constructor(public bracketId: number) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      bracketId: this.bracketId,
    };
  }

  toString(): string {
    return "Bracket Done";
  }

  toContent(): string {
    return `Bracket ID: ${this.bracketId}`;
  }
}

export class RoundFinishCond extends BaseNotiCond {
  name = "roundFinish";
  type = NotiType.ROUND_FINISH;

  constructor(public bracketId: number, public roundId: number) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      bracketId: this.bracketId,
      roundId: this.roundId,
    };
  }

  toString(): string {
    return "Round Done";
  }

  toContent(): string {
    return `Round ID: ${
      useExperimentStore.getState().brackets.length - this.bracketId
    }-${this.roundId + 1}`;
  }
}

export class TrialFinishCond extends BaseNotiCond {
  name = "trialFinish";
  type = NotiType.TRIAL_FINISH;

  constructor(public trialId: string) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      trialId: this.trialId,
    };
  }

  toString(): string {
    return "User Trial Done";
  }

  toContent(): string {
    return `Trial ID: ${this.trialId.slice(0, 3)}`;
  }
}

export class TimeoutCond extends BaseNotiCond {
  name?: string | undefined;
  type = NotiType.TIMEOUT;

  constructor(public time: Date) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      time: getUnixTime(this.time),
    };
  }

  toString(): string {
    return "Timeout";
  }

  toContent(): string {
    return format(this.time, "yyyy-MM-dd HH:mm:ss");
  }
}

export class CustomCond extends BaseNotiCond {
  type = NotiType.CUSTOM;
  name = "custom";

  toString(): string {
    return "Custom";
  }

  toContent(): string {
    return "Custom";
  }
}
