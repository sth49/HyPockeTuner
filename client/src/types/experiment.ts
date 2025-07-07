/* eslint-disable @typescript-eslint/no-explicit-any */

import { TrialRowType, GpuData, Shap, Hyperparam } from ".";
import { NotiCondPair } from "../models/notification";
// import { LinearRegression } from "../models/Linear";

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
  runningExp: string | null; // 현재 실행 중인 실험 ID
  expId: string; // 고정
  name: string; // 고정
  model: string; // 고정
  dataset: string; // 고정
  bohb: {
    eta: number; // 바뀜
    minBudget: number; // 바뀜
    maxBudget: number; // 바뀜
  };
  metric: {
    name: string; // 고정
  };
  status: ExpStatus; // 바뀜
  hyperparams?: Hyperparam[]; // 바뀜
  bestTrial?: TrialState | null; // 바뀜

  // 기본 정보
  lastUpdated?: number; // 세미고정? (마지막만 필요)
  startTime?: number; // 고정
  endTime?: number; // 고정

  // Trial 진행 상황
  totalTrials: number; // 고정
  curNumTrials: number; // 바뀜
  // firstBracketTrials: number; //필요없음

  brackets: BracketState[];
  push: Push[];
  interactions: Interaction[]; // 바뀜
  userTrials: TrialState[];

  notiCondPairs: NotiCondPair[]; // 알림 조건 쌍 (예: 이벤트 조건, 타임아웃 조건 등)
  gpuInfo: GpuData[]; // GPU 데이터 (예: 온도, 사용률 등)
  visibility: Visibility[]; // 바뀜

  shap: Shap | null; // SHAP 데이터 (null일 수도 있음)

  selectedTrials: TrialRowType[]; // 선택된 트라이얼들

  currBracketId: number; // 현재 브라켓 ID
  currRoundId: number; // 현재 라운드 ID
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

// Bracket 상태
export interface BracketState {
  id: number;
  startTime: number;
  endTime: number;
  rounds: RoundState[];
}

// Round 상태
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

// Trial 상태
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
  isBest?: boolean; // 현재 라운드에서 가장 좋은 트라이얼인지
  isFirstRound?: boolean; // 첫 라운드 트라이얼인지
  isLastRound?: boolean; // 마지막 라운드 트라이얼인지
  isFirstBracket?: boolean; // 첫 브라켓 트라이얼인지
  isLastBracket?: boolean; // 마지막 브라켓 트라이얼인지
  isLastExperiment?: boolean; // 마지막 실험 트라이얼인지
  status: string; // 트라이얼 상태 (예: "running", "finished", "failed")
  progress?: number; // 진행률 (0-100)
  history?: any[]; // 트라이얼 진행 히스토리: pause - resume 등
  sample: string; // 샘플링 정보
}
