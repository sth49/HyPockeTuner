// import moment from 'moment';

import { fromUnixTime } from "date-fns";
import { NotiType, NotiCondJSON } from "../notification.types";
import { BaseNotiCond } from "./BaseNotiCond";
import {
  ExperimentStartCond,
  ExperimentPauseCond,
  ExperimentResumeCond,
  ExperimentFinishCond,
} from "./ExperimentConditions";
import {
  MetricReachCond,
  MetricImproveByCond,
  MetricImproveCond,
} from "./MetricConditions";
import {
  BracketFinishCond,
  RoundFinishCond,
  TrialFinishCond,
  TimeoutCond,
  CustomCond,
} from "./ProgressConditions";
import {
  ExceptionHappenCond,
  HighTemperatureCond,
  LowUtilizationCond,
  HighUsageCond,
} from "./SystemConditions";

export class ConditionFactory {
  static fromJSON(json: NotiCondJSON): BaseNotiCond {
    let condition: BaseNotiCond;

    switch (json.type) {
      // Experiment conditions
      case NotiType.EXPERIMENT_START:
        condition = new ExperimentStartCond();
        break;
      case NotiType.EXPERIMENT_PAUSE:
        condition = new ExperimentPauseCond();
        break;
      case NotiType.EXPERIMENT_RESUME:
        condition = new ExperimentResumeCond();
        break;
      case NotiType.EXPERIMENT_FINISH:
        condition = new ExperimentFinishCond();
        break;

      // Metric conditions
      case NotiType.METRIC_REACH:
        condition = new MetricReachCond(json.target, json.recurring);
        break;
      case NotiType.METRIC_IMPROVE_BY:
        condition = new MetricImproveByCond(json.base, json.by, json.recurring);
        break;
      case NotiType.METRIC_IMPROVE:
        condition = new MetricImproveCond(json.base, json.recurring);
        break;

      // Progress conditions
      case NotiType.BRACKET_FINISH:
        condition = new BracketFinishCond(json.bracketId);
        break;
      case NotiType.ROUND_FINISH:
        condition = new RoundFinishCond(json.bracketId, json.roundId);
        break;
      case NotiType.TRIAL_FINISH:
        condition = new TrialFinishCond(json.trialId);
        break;
      case NotiType.TIMEOUT:
        condition = new TimeoutCond(fromUnixTime(json.timeoutAt));
        break;

      // System conditions
      case NotiType.EXCEPTION_HAPPEN:
        condition = new ExceptionHappenCond();
        break;
      case NotiType.HIGH_TEMPERATURE:
        condition = new HighTemperatureCond();
        break;
      case NotiType.LOW_UTILIZATION:
        condition = new LowUtilizationCond();
        break;
      case NotiType.HIGH_USAGE:
        condition = new HighUsageCond();
        break;

      // Other
      case NotiType.CUSTOM:
        condition = new CustomCond();
        break;

      default:
        throw new Error(`Unknown notification type: ${json.type}`);
    }

    // Set common properties
    condition.id = json.id;
    if (json.notifiedAt) {
      condition.notifiedAt = fromUnixTime(json.notifiedAt);
    }

    return condition;
  }
}
