/* eslint-disable @typescript-eslint/no-explicit-any */

import { TrialRowType, GpuData, Shap, Hyperparam } from ".";
import { NotiCondPair } from "../models/notification";

export interface SocketEvent {
  key: string;
  value: any;
  id: number;
  expId: string;
}

export type ExpStatus =
  | "pending"
  | "paused"
  | "auto_paused"
  | "running"
  | "reserved"
  | "finished";

export interface ExperimentState {
  runningExp: string | null;
  expId: string;
  name: string;
  model: string;
  dataset: string;
  bohb: {
    eta: number;
    minBudget: number;
    maxBudget: number;
  };
  metric: {
    name: string;
    range?: [number, number];
  };
  status: ExpStatus;
  hyperparams?: Hyperparam[];
  bestTrial?: TrialState | null;

  lastUpdated?: number;
  startTime?: number;
  endTime?: number;

  totalTrials: number;
  curNumTrials: number;

  brackets: BracketState[];
  push: Push[];
  interactions: Interaction[];
  userTrials: TrialState[];

  notiCondPairs: NotiCondPair[];
  gpuInfo: GpuData[];
  visibility: Visibility[];

  shap: Shap | null;

  selectedTrials: TrialRowType[];

  currBracketId: number;
  currRoundId: number;
}

export type Push = {
  condId?: string;
  content: string;
  id?: string;
  status?: string;
  time: number;
  title: string;
  type: string;
};
export type Interaction = {
  time: number;
  type: string;
  data: any;
};

export type Visibility = {
  time: number;
  isViewing: boolean;
  data: any;
};

export interface BracketState {
  id: number;
  startTime: number;
  endTime: number;
  rounds: RoundState[];
}

export interface RoundState {
  id: number;
  roundId: number;
  bracketId: number;
  budget: number;
  startTime?: number;
  endTime?: number;
  trials: TrialState[];
  defaultNumTrials: number;
}

export interface TrialState {
  id: string;
  event: string;
  bracketId: number;
  roundId?: number;
  trialId: number;
  budget?: number;
  params?: any;
  metric?: number;
  loss?: number;
  startTime: number;
  endTime: number;
  type?: string;
  dataset?: string;
  model?: string;
  name?: string;
  isBest?: boolean;
  isFirstRound?: boolean;
  isLastRound?: boolean;
  isFirstBracket?: boolean;
  isLastBracket?: boolean;
  isLastExperiment?: boolean;
  status: string;
  progress?: number;
  history?: any[];
  sample: string;
}
