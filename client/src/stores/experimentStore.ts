// stores/experimentStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { processExperimentEvent } from "./experimentEventProcessor";
import {
  Hyperparam,
  TrialRowType,
  ExperimentState,
  SocketEvent,
} from "../types";
import { NotiCondPair } from "../models/notification";

interface ExperimentStore extends ExperimentState {
  // 액션들
  // initializeExperiment: (expId: string, status: ExpStatus) => void;
  initializeExperiment: (expData: any) => void;
  // initializeRunningExperiment: (expId: string, status: ExpStatus) => void;
  processEvent: (event: SocketEvent) => void;
  processEvents: (events: SocketEvent[]) => void;
  // processEvents: (events: ExperimentEvent[], expId: string) => void;
  // processEvents: (events: ExperimentEvent[]) => void;

  setSelectedTrials: (trials: TrialRowType[]) => void;
  setNotiCondPairs: (pairs: NotiCondPair[]) => void;
}
// stores/experimentStore.ts
export const useExperimentStore = create<ExperimentStore>()(
  subscribeWithSelector((set, get) => ({
    runningExp: null, // 현재 실행 중인 실험 ID
    expId: "", // 현재 보고있는 실험 ID
    name: "", // 고정
    model: "", // 고정
    dataset: "", // 고정
    bohb: {
      eta: 3, // 바뀜
      minBudget: 1, // 바뀜
      maxBudget: 81, // 바뀜
    },
    metric: {
      name: "", // 고정
    },
    status: "pending",
    hyperparams: [], // 바뀜
    bestTrial: null, // 현재 가장 좋은 트라이얼 (null일 수도 있음)

    lastUpdated: undefined,
    startTime: undefined, // 고정
    endTime: undefined, // 고정

    totalTrials: 0,
    curNumTrials: 0,

    // firstBracketTrials: 0,
    brackets: [],
    push: [],
    interactions: [],
    userTrials: [],

    notiCondPairs: [], // 알림 조건 쌍 (예: 이벤트 조건, 타임아웃 조건 등)
    gpuInfo: [], // GPU 데이터 (예: 온도, 사용률 등)
    visibility: [],
    shap: null, // SHAP 데이터 (null일 수도 있음)

    selectedTrials: [], // 선택된 트라이얼들

    currBracketId: 0, // 현재 브라켓 ID
    currRoundId: 0, // 현재 라운드 ID

    initializeExperiment: (expData) => {
      console.log("Initializing experiment with data:", expData);
      const hparams = expData.hyperparameters.map((hparam: any) => {
        return Hyperparam.fromJSON(hparam);
      });

      const notiCondPairs = expData.cond.map((cond: any) => {
        return NotiCondPair.fromJSON(cond);
      });

      set({
        expId: expData.expId,
        name: expData.name,
        model: expData.model,
        dataset: expData.dataset,
        bohb: {
          eta: expData.bohb.eta,
          minBudget: expData.bohb.min_budget,
          maxBudget: expData.bohb.max_budget,
        },
        metric: expData.metric,
        status: expData.status,
        hyperparams: hparams,
        bestTrial: null,

        lastUpdated: undefined,
        startTime: undefined, // 고정
        endTime: undefined, // 고정

        totalTrials: 0,
        curNumTrials: 0,

        brackets: [],
        push: [],
        interactions: [],
        userTrials: [],

        notiCondPairs: notiCondPairs, // 알림 조건 쌍 (예: 이벤트 조건, 타임아웃 조건 등)
        gpuInfo: [], // GPU 데이터 (예: 온도, 사용률 등)
        visibility: [],
        shap: null, // SHAP 데이터 (null일 수도 있음)

        selectedTrials: [], // 선택된 트라이얼들

        currBracketId: 0, // 현재 브라켓 ID
        currRoundId: 0, // 현재 라운드 ID
      });

      const allCallbacks = expData.allCallbacks.filter(
        (callback: any) => callback.key !== "lastUpdated"
      );

      if (allCallbacks) {
        get().processEvents(allCallbacks);
      }

      console.log("callbacks", allCallbacks);

      console.log("Initializing experiment with data:", expData);
    },

    processEvent: (event: SocketEvent) => {
      const state = get();
      const updatedState = processExperimentEvent(state, event);
      console.log("Before Processing event:", state);
      console.log("After Processing event:", updatedState);
      set({
        ...state,
        ...updatedState,
      });
      // 상태가 실제로 변경되었는지 확인
      // if (
      //   JSON.stringify(state.brackets) !== JSON.stringify(updatedState.brackets)
      // ) {
      //   console.log("Brackets changed:", updatedState.brackets);
      // }
    },

    processEvents: (events: SocketEvent[]) => {
      let state = get();
      let hasChanged = false;

      for (const event of events) {
        const newState = processExperimentEvent(state, event);
        if (
          JSON.stringify(state.brackets) !== JSON.stringify(newState.brackets)
        ) {
          hasChanged = true;
        }
        state = { ...state, ...newState };
      }

      if (hasChanged) {
        set({ ...state });
        console.log("After processing events:", state);
      }
    },
    setSelectedTrials: (trials: TrialRowType[]) => {
      set({ selectedTrials: trials });
    },
    setNotiCondPairs: (pairs: NotiCondPair[]) => {
      set({ notiCondPairs: pairs });
    },
  }))
);
