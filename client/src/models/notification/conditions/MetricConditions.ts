import { BaseNotiCond } from "./BaseNotiCond";
import { NotiType, NotiCondJSON } from "../notification.types";
// import { useCurrExp } from '../../../store';

export class MetricImproveByCond extends BaseNotiCond {
  name = "metricImproveBy";
  type = NotiType.METRIC_IMPROVE_BY;

  constructor(
    public base: number,
    public by: number,
    public recurring: boolean
  ) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      base: this.base,
      by: this.by,
      recurring: this.recurring,
    };
  }

  toString(): string {
    // const metricName = useCurrExp.getState().currExp.metric.name;
    const metricName = "Metric"; // Placeholder, replace with actual metric name from state
    return `${metricName} Improved by ${this.by}`;
  }

  toContent(): string {
    const baseText = `from ${this.base.toFixed(3)}`;
    return this.recurring ? `${baseText} | Recurring` : baseText;
  }
}

export class MetricImproveCond extends BaseNotiCond {
  name = "metricImprove";
  type = NotiType.METRIC_IMPROVE;

  constructor(public base: number, public recurring: boolean) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      base: this.base,
      recurring: this.recurring,
    };
  }

  toString(): string {
    // const metricName = useCurrExp.getState().currExp.metric.name;
    const metricName = "Metric"; // Placeholder, replace with actual metric name from state
    return `${metricName} Improved`;
  }

  toContent(): string {
    const baseText = `from ${this.base.toFixed(3)}`;
    return this.recurring ? `${baseText} | Recurring` : baseText;
  }
}

export class MetricReachCond extends BaseNotiCond {
  name = "metricReach";
  type = NotiType.METRIC_REACH;

  constructor(public target: number, public recurring: boolean = false) {
    super();
  }

  toJSON(): NotiCondJSON {
    return {
      ...super.toJSON(),
      target: this.target,
      recurring: this.recurring,
    };
  }

  toString(): string {
    // const metricName = useCurrExp.getState().currExp.metric.name;
    const metricName = "Metric"; // Placeholder, replace with actual metric name from state
    return `${metricName} Reached`;
  }

  toContent(): string {
    const targetText = `target: ${this.target.toFixed(3)}`;
    return this.recurring ? `${targetText} | Recurring` : targetText;
  }
}
