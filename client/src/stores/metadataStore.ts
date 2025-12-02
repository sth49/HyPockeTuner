/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { createExpSummary, ExpSummary, SummaryData } from "../types/summary";
import { BOHBOption, ExpOption } from "../types/option";
import { SocketEvent } from "../types/experiment";

interface MetadataState {
  
  expList: ExpSummary[];
  
  expOptions: any;
  
  kernelInfo: any;

  defaultExpOptions: ExpOption;
  newExpOptions: ExpOption;
  
  setExpList: (expList: any[]) => void;
  setExpOptions: (expOptions: any) => void;
  setKernelInfo: (kernelInfo: any) => void;
  setAllMetadata: (data: {
    expList: any[];
    expOptions: any;
    kernelInfo: any;
    newExpOptions: any;
  }) => void;
  //   resetMetadata: () => void;

  setNewExpOptions: (newExpOptions: any) => void;
  processEvent: (event: SocketEvent) => void;
}

export const useMetadataStore = create<MetadataState>((set) => ({
  expList: [],
  expOptions: {},
  kernelInfo: {},
  defaultExpOptions: {
    name: "",
    model: "",
    dataset: "",
    metric: {
      name: "",
      range: [0, 1], // [min, max]
    },
    hyperparams: [],
    bohb: {} as BOHBOption,
  },
  newExpOptions: {
    name: "",
    model: "",
    dataset: "",
    metric: {
      name: "",
      range: [0, 1], // [min, max]
    },
    hyperparams: [],
    bohb: {} as BOHBOption,
  },

  setExpList: (expList) => set({ expList }),
  setExpOptions: (expOptions) => set({ expOptions }),
  setKernelInfo: (kernelInfo) => set({ kernelInfo }),

  setAllMetadata: (data) =>
    set({
      expList: data.expList,
      expOptions: data.expOptions,
      kernelInfo: data.kernelInfo,
      defaultExpOptions: data.newExpOptions,
      newExpOptions: data.newExpOptions,
    }),

  setNewExpOptions: (newExpOptions) => set({ newExpOptions }),
  processEvent: (event: SocketEvent) => {
    console.log("Processing Metadata Event", event);
    const { key, value, expId } = event;

    switch (key) {
      case "experiment_list": {
        const expListData =
          value.map((item: SummaryData) => {
            return createExpSummary(item);
          }) || [];
        set(() => ({
          expList: expListData,
        }));
        break;
      }
      case "lastUpdated": {
        console.log("Updating lastUpdated", value);
        const relatedExp = useMetadataStore
          .getState()
          .expList.find((exp) => exp.id === expId);
        if (relatedExp) {
          relatedExp.lastUpdatedAt = value;
        }
        set((state) => ({
          expList: state.expList.map((exp) =>
            exp.id === expId ? { ...exp, lastUpdatedAt: value } : exp
          ),
        }));
        break;
      }
      case "trialDone": {
        set((state) => ({
          expList: state.expList.map((exp) =>
            exp.id === expId
              ? {
                  ...exp,
                  bestTrial:
                    (exp.bestTrial ?? -Infinity) < value.metric
                      ? value.metric
                      : exp.bestTrial,
                }
              : exp
          ),
        }));
        break;
      }
      case "curNumTrials": {
        console.log("Updating current number of trials", value);

        set((state) => ({
          expList: state.expList.map((exp) =>
            exp.id === expId ? { ...exp, doneTrials: value } : exp
          ),
        }));

        break;
      }

      default:
        console.warn(`Unknown metadata event key: ${key}`);
    }
  },
}));
