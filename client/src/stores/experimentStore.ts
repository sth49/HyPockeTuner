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
    runningExp: null,
    expId: "",
    name: "",
    model: "",
    dataset: "",
    bohb: {
      eta: 3,
      minBudget: 1,
      maxBudget: 81,
    },
    metric: {
      name: "",
      range: [0, 1],
    },
    status: "pending",
    hyperparams: [],
    bestTrial: null,

    lastUpdated: undefined,
    startTime: undefined,
    endTime: undefined,

    totalTrials: 0,
    curNumTrials: 0,

    // firstBracketTrials: 0,
    brackets: [],
    push: [],
    interactions: [],
    userTrials: [],

    notiCondPairs: [],
    gpuInfo: [],
    visibility: [],
    shap: null,

    selectedTrials: [],

    currBracketId: 0,
    currRoundId: 0,

    initializeExperiment: (expData) => {
      console.log("Initializing experiment with data:", expData);
      const hparams = expData.hyperparameters.map((hparam: any) => {
        return Hyperparam.fromJSON(hparam);
      });

      const notiCondPairs = expData.cond.map((cond: any) => {
        return NotiCondPair.fromJSON(cond);
      });

      set({
        runningExp: expData.runningExp || null,
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

        lastUpdated: expData.lastUpdated * 1000,
        startTime: expData.startTime * 1000,
        endTime: expData.endTime * 1000,

        totalTrials: expData.totalTrials,
        curNumTrials: expData.curNumTrials,

        brackets: [],
        push: [],
        interactions: [],
        userTrials: [],

        notiCondPairs: notiCondPairs,
        gpuInfo: [],
        visibility: [],
        shap: null,

        selectedTrials: [],

        currBracketId: 0,
        currRoundId: 0,
      });

      const allCallbacks = expData.allCallbacks.filter(
        (callback: any) =>
          callback.key !== "lastUpdated" &&
          callback.key !== "startTime" &&
          callback.key !== "endTime" &&
          callback.key !== "status" &&
          callback.key !== "runningExp"
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
      console.log("🔍 Before Processing event:", {
        runningExp: state.runningExp,
        status: state.status,
        expId: state.expId,
      });
      console.log("🔍 After Processing event:", updatedState);

      set(updatedState);

      
      const finalState = get();
      console.log("🔍 Final state after set:", {
        runningExp: finalState.runningExp,
        status: finalState.status,
        expId: finalState.expId,
      });
    },

    processEvents: (events: SocketEvent[]) => {
      let state = get();
      let hasChanged = false;

      for (const event of events) {
        const newState = processExperimentEvent(state, event);
        if (
          JSON.stringify(state.brackets) !==
            JSON.stringify(newState.brackets) ||
          state.runningExp !== newState.runningExp ||
          state.status !== newState.status
        ) {
          hasChanged = true;
        }
        state = { ...state, ...newState };
      }

      if (hasChanged) {
        set(state);
        console.log("🔍 After processing events:", state);
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
