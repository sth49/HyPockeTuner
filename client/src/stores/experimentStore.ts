// stores/experimentStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { processExperimentEvent } from "../utils/experimentEventProcessor";
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

      console.log("Initializing experiment with data:", expData);

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
    },

    processEvent: (event: SocketEvent) => {
      const state = get();
      const updatedState = processExperimentEvent(state, event);
      console.log("After Processing event:", state);
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
  }))
  // subscribeWithSelector((set, get) => ({
  // initializeRunningExperiment: (expId: string, status: ExpStatus) => {
  //   set({
  //     runningExp: {
  //       expId,
  //       status,
  //       lastUpdated: 0,
  //       totalTrials: 0,
  //       curNumTrials: 0,
  //       brackets: [],
  //     },
  //   });
  // },

  // 액션들
  // initializeExperiment: (expId: string, status: ExpStatus) => {
  //   set({
  //     expId,
  //     status,
  //     lastUpdated: Date.now() / 1000,
  //   });
  // },

  // processEvent: (event: ExperimentEvent, type: string) => {
  //   const state = type === "current" ? get().currentExp : get().runningExp;
  //   if (!state) {
  //     console.error("Experiment state is not initialized");
  //     return;
  //   }
  //   const updatedState = processExperimentEvent(state, event);
  //   if (type === "current") {
  //     set({ currentExp: { ...state, ...updatedState } });
  //   }
  //   if (type === "running") {
  //     set({ runningExp: { ...state, ...updatedState } });
  //   }
  //   console.log("After initialization:", type, state.brackets);
  // },
  // processEvents: (events: ExperimentEvent[], type: string) => {
  //   let state = type === "current" ? get().currentExp : get().runningExp;
  //   if (!state) {
  //     console.error("Experiment state is not initialized");
  //     return;
  //   }
  //   for (const event of events) {
  //     state = { ...state, ...processExperimentEvent(state, event) };
  //   }
  //   if (type === "current") {
  //     set({ currentExp: state });
  //   }
  //   if (type === "running") {
  //     set({ runningExp: state });
  //   }
  //   console.log("After initialization:", type, state.brackets);
  // },
  // set(state);
  // processEvents: (events: ExperimentEvent[]) => {
  //   let state = get();
  //   for (const event of events) {
  //     state = { ...state, ...processExperimentEvent(state, event) };
  //   }
  //   set(state);
  //   console.log("After initialization:", get().brackets);
  // },

  // subscribeWithSelector((set, get) => ({
  //   // 초기 상태
  //   expId: "",
  //   status: "pending",
  //   lastUpdated: 0,
  //   totalTrials: 0,
  //   curNumTrials: 0,
  //   firstBracketTrials: 0,
  //   brackets: [],

  //   // 액션들
  //   initializeExperiment: (expId: string, status: ExpStatus) => {
  //     set({
  //       expId,
  //       status,
  //       lastUpdated: Date.now() / 1000,
  //     });
  //   },

  //   processEvent: (event: ExperimentEvent) => {
  //     const state = get();
  //     const updatedState = processExperimentEvent(state, event);
  //     set({ ...state, ...updatedState });
  //   },

  //   processEvents: (events: ExperimentEvent[]) => {
  //     let state = get();
  //     for (const event of events) {
  //       state = { ...state, ...processExperimentEvent(state, event) };
  //     }
  //     set(state);
  //     console.log("After initialization:", get().brackets);
  //   },
  // }))
);
