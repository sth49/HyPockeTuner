/* eslint-disable @typescript-eslint/no-explicit-any */
import { HyperparamOption } from "../models/HyperparameterOption";

export interface BOHBOption {
  minBudget: number;
  maxBudget: number;
  eta: number;
}

export interface HyperparameterConfig {
  name: string;
  value: string | number | boolean;
  type: "string" | "number" | "boolean";
  range?: [number, number];
  options?: string[];
}

interface DatasetModelMapping {
  [dataset: string]: string[];
}

interface DatasetHyperparameters {
  [dataset: string]: HyperparameterConfig[];
}
interface ModelMetric {
  name: string;
  range: [number, number];
}

interface ModelConfig {
  metric: ModelMetric;
  hyperparameters: string[];
}
interface ModelConfigMapping {
  [model: string]: ModelConfig;
}

export interface ExpOption {
  name: string;
  model: string;
  dataset: string;
  metric: {
    name: string;
    range: [number, number];
  };
  hyperparams: HyperparamOption[];
  bohb: BOHBOption;
}
export const toJSON = (option: ExpOption): any => {
  console.log("toJSON called with option:", option);
  return {
    name: option.name,
    model: option.model,
    dataset: option.dataset,
    metric: {
      name: option.metric.name,
      range: option.metric.range,
    },
    hyperparameters: option.hyperparams.map((hparam) => hparam.toJSON()),
    bohb: {
      min_budget: option.bohb.minBudget,
      max_budget: option.bohb.maxBudget,
      eta: option.bohb.eta,
    },
  };
};

export interface AllExpOption {
  allHyperparams: DatasetHyperparameters;
  dataset: string[];
  datasetModel: DatasetModelMapping;
  modelConfig: ModelConfigMapping;
}

export const createExpOption = (json: any): ExpOption => {
  const hyperparams: HyperparamOption[] = json.hyperparameters.map(
    (hparam: any, i: number) => {
      return HyperparamOption.fromJSON(hparam.name, i, hparam);
    }
  );
  return {
    name: json.name || "Exp",
    model: json.model,
    dataset: json.dataset,
    metric: {
      name: json.metric.name,
      range: json.metric.range || [0, 1],
    },
    hyperparams: hyperparams,
    bohb: {
      minBudget: json.bohb.min_budget,
      maxBudget: json.bohb.max_budget,
      eta: json.bohb.eta,
    },
  };
};
export const createAllExpOption = (json: any): AllExpOption => {
  const allHyperparams: DatasetHyperparameters = {};
  for (const dataset in json.all_hyperparameters) {
    allHyperparams[dataset] = json.all_hyperparameters[dataset].map(
      (hparam: any, i: number) => {
        return HyperparamOption.fromJSON(hparam.name, i, hparam);
      }
    );
  }

  return {
    allHyperparams: allHyperparams,
    dataset: json.dataset,
    datasetModel: json.dataset_model,
    modelConfig: json.model_config,
  };
};
