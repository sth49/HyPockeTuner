// Moment 제거, Date 타입 사용
export enum NotiType {
  // Experiment lifecycle
  EXPERIMENT_START = "experiment-started",
  EXPERIMENT_RESUME = "experiment-resumed",
  EXPERIMENT_PAUSE = "experiment-paused",
  EXPERIMENT_FINISH = "experiment-done",

  // Metric events
  METRIC_IMPROVE_BY = "metric-improved-by",
  METRIC_IMPROVE = "metric-improved",
  METRIC_REACH = "metric-reached",

  // Progress events
  BRACKET_FINISH = "bracket-done",
  ROUND_FINISH = "round-done",
  TRIAL_FINISH = "trial-done",

  // System events
  TIMEOUT = "timeout",
  EXCEPTION_HAPPEN = "exception-raised",
  HIGH_TEMPERATURE = "high-temperature",
  LOW_UTILIZATION = "low-utilization",
  HIGH_USAGE = "high-usage",

  // Other
  CUSTOM = "custom",
}

export const Type = {
  ExperimentStart: NotiType.EXPERIMENT_START,
  ExperimentResume: NotiType.EXPERIMENT_RESUME,
  ExperimentPause: NotiType.EXPERIMENT_PAUSE,
  ExperimentFinish: NotiType.EXPERIMENT_FINISH,
  MetricImproveBy: NotiType.METRIC_IMPROVE_BY,
  MetricImprove: NotiType.METRIC_IMPROVE,
  MetricReach: NotiType.METRIC_REACH,
  BracketFinish: NotiType.BRACKET_FINISH,
  RoundFinish: NotiType.ROUND_FINISH,
  TrialFinish: NotiType.TRIAL_FINISH,
  Timeout: NotiType.TIMEOUT,
  ExceptionHappen: NotiType.EXCEPTION_HAPPEN,
  HighTemperature: NotiType.HIGH_TEMPERATURE,
  LowUtilization: NotiType.LOW_UTILIZATION,
  HighUsage: NotiType.HIGH_USAGE,
  Custom: NotiType.CUSTOM,
};

export interface NotiCondJSON {
  id: string;
  type: NotiType;
  notifiedAt?: number; // Unix timestamp
  [key: string]: any;
}

export interface INotiCond {
  id: string;
  name?: string;
  type?: NotiType;
  notifiedAt: Date | null; // Date 객체로 변경

  toJSON(): NotiCondJSON;
  toString(): string;
  toContent(): string;
}

export type NotiStatus = "satisfied" | "expired" | null;

export interface NotiCondPairJSON {
  id: string;
  eventCond: NotiCondJSON;
  timeoutCond: NotiCondJSON | null;
  createdAt: number; // Unix timestamp
  active: boolean;
  status: NotiStatus;
  confirmed: boolean;
}

export interface INotiCondPair {
  id: string;
  active: boolean;
  status: NotiStatus;
  createdAt: Date; // Date 객체로 변경
  confirmed: boolean;
  eventCond: INotiCond;
  timeoutCond: INotiCond | null;

  isWatching: boolean;
  isSatisfied: boolean;
  isExpired: boolean;

  toJSON(): NotiCondPairJSON;
}
