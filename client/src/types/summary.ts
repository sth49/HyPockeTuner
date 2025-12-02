// src/types/summary.ts
import { ExpStatus, TrialState } from "./experiment";

export interface SummaryData {
  id: string;
  name: string;
  dataset: string;
  model: string;
  metric: string;
  hparamList: string[];
  budget: number;
  lastUpdatedAt: number;
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
  lastUpdatedAt: number;
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
    lastUpdatedAt: json.lastUpdatedAt,
    status: json.status,
    bestTrial: json.bestTrial?.metric ?? 0,
    allTrials: json.allTrials,
    doneTrials: json.doneTrials,
    duration: "",
  };
};
