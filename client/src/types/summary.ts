// src/types/summary.ts
// import { format, formatDistance } from "date-fns";
import { ExpStatus, TrialState } from "./experiment";
// 상태 타입 정의

export interface SummaryData {
  id: string;
  name: string;
  dataset: string;
  model: string;
  metric: string;
  hparamList: string[];
  budget: number;
  lastUpdatedAt: number; // Unix timestamp (초 단위)
  status: ExpStatus;
  bestTrial: TrialState | null;
  allTrials: number;
  doneTrials: number;
}

export interface ExpSummary {
  id: string;
  name: string;
  dataset: string;
  model: string;
  metric: string;
  hparamList: string[];
  budget: number;
  lastUpdatedAt: number; // Date 객체 사용
  status: ExpStatus;
  bestTrial: number;
  allTrials: number;
  doneTrials: number;
  startTime?: Date;
  endTime?: Date;
  duration: string;
}

export const createExpSummary = (json: SummaryData): ExpSummary => {
  return {
    id: json.id,
    name: json.name,
    dataset: json.dataset,
    model: json.model,
    metric: json.metric,
    hparamList: json.hparamList,
    budget: json.budget,
    lastUpdatedAt: json.lastUpdatedAt, // Unix 타임스탬프를 Date 객체로 변환
    status: json.status,
    bestTrial: json.bestTrial?.metric ?? 0,

    // bestTrial: json.bestTrial
    //   ? createTrial({
    //       ...json.bestTrial,
    //       config: undefined,
    //     })
    //   : null,
    allTrials: json.allTrials,
    doneTrials: json.doneTrials,
    duration: "",
  };
};

// 유틸리티 함수
// export const calculateDuration = (summary: ExpSummary): string => {
//   if (summary.startTime && summary.endTime) {
//     return formatDistance(summary.endTime, summary.startTime);
//   }
//   return "";
// };

// export const formatLastUpdated = (date: Date): string => {
//   return format(date, 'yyyy-MM-dd HH:mm:ss');
// };
