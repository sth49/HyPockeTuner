import {
  Hyperparam,
  HyperparamTypes,
  OrderedHyperparam,
  UniformHyperparam,
  UnorderedHyperparam,
} from "./hyperparameter";

export class Shap {
  public baseValue!: number;
  public ranking!: { [key: string]: number };
  public shapValues: ShapValue[] = [];

  constructor(
    baseValue: number,
    ranking: [string, number][],
    hyperparams: Hyperparam[],
    data?: any
  ) {
    this.baseValue = baseValue;
    this.ranking = ranking.reduce(
      (acc: { [key: string]: number }, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {}
    );

    for (const hparam of hyperparams) {
      this.shapValues.push(
        new ShapValue(
          hparam,
          data && data[hparam.name] !== undefined
            ? data[hparam.name]["values"]
            : undefined
        )
      );
    }
  }
}

type ShapValueData = {
  [key: string]: {
    shapValues: number[];
    metricValues?: number[]; // Optional, used for original values in the server
    count: number;
    totalImpact: number;
    meanImpact: number;
  };
};
export class ShapValue {
  public type!: HyperparamTypes;
  public name!: string;
  public displayName!: string;
  public values: number[] | string[] | boolean[] = [];
  public shapValues: ShapValueData = {};
  constructor(hparam: Hyperparam, data?: ShapValueData) {
    this.type = hparam.type;
    this.name = hparam.name;
    this.displayName = hparam.displayName;
    if (data) {
      this.shapValues = data;
    } else {
      this.shapValues = {};
    }

    if (hparam instanceof UniformHyperparam) {
      this.values = [hparam.range[0], hparam.range[1]];
    } else if (
      hparam instanceof UnorderedHyperparam ||
      hparam instanceof OrderedHyperparam
    ) {
      this.values = hparam.values;
    } else {
      throw new Error(`Unknown hyperparameter type: ${hparam.type}`);
    }
  }
}
