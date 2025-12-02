import { Hyperparam, UniformHyperparam, UnorderedHyperparam } from "../types";
import { TrialState } from "../types/experiment";

import * as d3 from "d3";

export class HyperparamSet {
  public id: string;
  public params: Record<string, any>;
  public trials: TrialState[] = [];
  public color: string = "#000000";
  public isSelected: boolean = false;

  constructor(id: string, params: Record<string, any>) {
    this.id = id;
    this.params = params;
  }
  // get metric() {
  //   return d3.max(this.trials, (t) => {
  //     return t.metric;
  //   });
  // }
  get metric() {
    const result = d3.max(this.trials, (t) => t.metric);
    if (result === undefined) {
      console.log(
        `⚠️ ParamSet ${this.id} metric is undefined. Trials:`,
        this.trials.map((t) => ({
          id: t.id,
          metric: t.metric,
          type: typeof t.metric,
        }))
      );
    }
    return result;
  }
  get budget() {
    return Math.exp(
      this.trials.reduce((sum, t) => Math.log(t.budget ?? 0) + sum, 0) /
        this.trials.length
    );
  }
  get maxRoundId() {
    return d3.max(this.trials, (t: TrialState) => t.roundId);
  }
  get maxBudget() {
    return d3.max(this.trials, (t: TrialState) => t.budget);
  }
  get lastTrial() {
    return this.trials[this.trials.length - 1];
  }

  public vectorize(hparams: Hyperparam[]): number[] {
    let vec: number[] = [];
    hparams.forEach((hparam) => {
      const value = this.params[hparam.name];
      let v: number[] = [];
      if (hparam instanceof UnorderedHyperparam) {
        v = Array.from(Array(hparam.values.length), () => 0);
        const idx = (hparam.values as Array<string | number | boolean>).indexOf(
          value
        );
        if (idx !== -1) {
          v[idx] = 1;
        }
      } else if (hparam instanceof UniformHyperparam) {
        v = Array.from(Array(hparam.regressionBins), () => 0);
        const values = hparam.getThresholds();
        let i;
        for (i = 0; i < hparam.regressionBins; i++) {
          if (value < values[i]) break;
        }
        if (i == hparam.regressionBins) i--;
        v[i] = 1;
      }
      vec = vec.concat(v);
    });
    return vec;
  }
}
