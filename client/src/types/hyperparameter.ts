import { HyperparamOption } from "../models/HyperparameterOption";
import { formatting } from "../utils";

export enum HyperparamTypes {
  Ordinal,
  Unordered,
  Uniform,
}

export class Hyperparam {
  public type!: HyperparamTypes;

  public formatter = (x: any) => x;
  public narrowHistory: any[] = [];
  constructor(
    public name: string,
    public displayName: string,
    public selected: boolean = false, // public values: number[] | string[] = []
    public narrowValue: any,
    public beforeChange: any,
    public isConstant: boolean = false,
    public constantValue: any = null
  ) {}

  static fromJSON(json: any): Hyperparam {
    if (json.type === "ordered") {
      return new OrderedHyperparam(
        json.name,
        json.displayName,
        json.selected,
        json.values as number[]
      );
    } else if (json.type === "unordered") {
      return new UnorderedHyperparam(
        json.name,
        json.displayName,
        json.selected,
        json.values as string[]
      );
    } else if (json.type === "uniform") {
      return new UniformHyperparam(
        json.name,
        json.displayName,
        json.selected,
        json.range as [number, number]
      );
    } else {
      throw new Error(`Unknown hyperparameter type: ${json.type}`);
    }
  }

  getIsConstant() {
    return this.isConstant;
  }

  getNarrowHistory(data: any) {
    const returnData = {
      beforeChange: this.beforeChange,
      afterChange: this.beforeChange,
    };
    if (this.type === HyperparamTypes.Uniform) {
      this.narrowHistory.forEach((h) => {
        if (h.lower === data.lower && h.upper === data.upper) {
          returnData.afterChange = [+data.lower, +data.upper];
          return returnData;
        } else {
          returnData.beforeChange = [+h.lower, +h.upper];
        }
      });
    } else {
      this.narrowHistory.forEach((h) => {
        // console.log("h", h, "data", data);
        if (h.value.every((value: any) => data.value.includes(value))) {
          // console.log("====== h === data ====");
          returnData.afterChange = returnData.afterChange.filter(
            (value: any) => !h.value.includes(value)
          );
          return returnData;
        } else {
          returnData.beforeChange = returnData.beforeChange.filter(
            (value: any) => !h.value.includes(value)
          );
          returnData.afterChange = returnData.afterChange.filter(
            (value: any) => !h.value.includes(value)
          );
        }
      });
    }
    return returnData;
  }
  toUserTrial(userValue: string | number | boolean): any {
    if (this.type === HyperparamTypes.Uniform) {
      return {
        name: this.name,
        type: this.type,
        value: [+userValue, +userValue],
      };
    }
    if (this.type === HyperparamTypes.Ordinal) {
      return {
        name: this.name,
        type: this.type,
        value: [+userValue],
      };
    } else {
      if (userValue.toString().startsWith("."))
        return {
          name: this.name,
          type: this.type,
          value: [+("0" + userValue)],
        };
      return {
        name: this.name,
        type: this.type,
        value: [userValue],
      };
    }
  }

  toNarrow(data: any) {
    if (this.type === HyperparamTypes.Uniform) {
      return {
        name: this.name,
        value: null,
        lower: +data[0],
        upper: +data[1],
        mean: null,
        sigma: null,
      };
    } else {
      return {
        name: this.name,
        value: data,
        lower: null,
        upper: null,
        mean: null,
        sigma: null,
      };
    }
  }

  checkValueInSpace(data: any) {
    if (this.type === HyperparamTypes.Uniform) {
      if (data.includes("~")) {
        const temp = data.split("~")[1].trim();
        data = temp;
      }
      if (+data >= this.narrowValue[0] && +data <= this.narrowValue[1]) {
        return true; // 범위에 포함됨
      }
      return false; // 범위에 포함되지 않음
    }
    if (this.type === HyperparamTypes.Ordinal) {
      if (this.narrowValue.includes(+data)) {
        return true; // 값이 범위에 포함됨
      }
      return false; // 값이 범위에 포함되지 않음
    } else if (this.type === HyperparamTypes.Unordered) {
      if (data === "True" || data === "False") {
        data = data === "True"; // boolean 값으로 변환
      }

      if (this.narrowValue.includes(data)) {
        return true; // 값이 범위에 포함됨
      }
      return false; // 값이 범위에 포함되지 않음
    }
    return false;
  }

  checkSpaceChange(data: any) {
    if (this.type === HyperparamTypes.Uniform) {
      // Check if the values are exactly the same (no change)
      if (+data[0] === this.narrowValue[0] && +data[1] === this.narrowValue[1]) {
        return false; // No change
      }
      
      // Check if the new range is invalid (outside bounds or empty)
      if (
        +data[0] < this.narrowValue[0] ||
        +data[1] > this.narrowValue[1] ||
        +data[0] >= +data[1]
      ) {
        return false; // Invalid range
      }
      
      return true; // Valid change detected
    } else {
      const dataSet = new Set(data);
      const narrowSet = new Set(this.narrowValue);
      // dataSet이랑 narrowSet이랑 똑같이 생겼으면 안바뀐 것
      if (dataSet.size !== narrowSet.size) {
        return true; // 개수가 다르면 바뀐 것
      }
      for (const value of narrowSet) {
        if (!dataSet.has(value)) {
          return true; // narrowSet에 있는 값이 dataSet에 없으면 바뀐 것
        }
      }
    }
    return false; // 범위가 안바뀐 것
  }
  createOption(index: number): HyperparamOption {
    if (this.type === HyperparamTypes.Unordered) {
      const json = {
        type: "unordered",
        values: this.narrowValue,
      };
      return HyperparamOption.fromJSON(this.name, index, json);
    } else if (this.type === HyperparamTypes.Ordinal) {
      const json = {
        type: "ordinal",
        range: [
          this.narrowValue[0],
          this.narrowValue[this.narrowValue.length - 1],
        ],
        values: this.narrowValue,
      };
      return HyperparamOption.fromJSON(this.name, index, json);
    } else if (this.type === HyperparamTypes.Uniform) {
      const json = {
        type: "uniform",
        range: this.narrowValue,
        values: this.narrowValue,
      };
      return HyperparamOption.fromJSON(this.name, index, json);
    } else {
      throw new Error(`Unknown hyperparameter type: ${this.type}`);
    }
  }

  formatting(value: any): string {
    if (this.type === HyperparamTypes.Unordered) {
      return value === true
        ? "True"
        : value === false
        ? "False"
        : value.toString();
    } else if (this.type === HyperparamTypes.Ordinal) {
      return value.toString();
    } else if (this.type === HyperparamTypes.Uniform) {
      const numValue = Number(value);
      if (numValue === 0) {
        return "0"; // 0은 그대로 표시
      }
      if (Math.abs(numValue) < 0.001 && numValue !== 0) {
        return numValue.toExponential(0); // 2자리 정밀도의 과학적 표기법
      }
      return formatting(numValue, "float", 3);
    }
    return value.toString();
  }
}
export class OrderedHyperparam extends Hyperparam {
  type = HyperparamTypes.Ordinal;
  constructor(
    name: string,
    displayName: string,
    selected: boolean,
    public values: number[]
  ) {
    super(
      name,
      displayName,
      selected,
      values,
      values,
      values.length === 1 ? true : false,
      values.length === 1 ? values[0] : null
    );
  }
}
export class UnorderedHyperparam extends Hyperparam {
  type = HyperparamTypes.Unordered;
  constructor(
    name: string,
    displayName: string,
    selected: boolean,
    public values: string[] | boolean[] = []
  ) {
    super(
      name,
      displayName,
      selected,
      values,
      values,
      values.length === 1 ? true : false,
      values.length === 1 ? values[0] : null
    );
  }
}
export function range(n: number) {
  return new Array(n).fill(0).map((_, i) => i);
}
export class UniformHyperparam extends Hyperparam {
  type = HyperparamTypes.Uniform;
  regressionBins = 4;
  constructor(
    name: string,
    displayName: string,
    selected: boolean = false,
    public range: [number, number]
  ) {
    super(
      name,
      displayName,
      selected,
      range,
      range,
      range[0] === range[1] ? true : false,
      range[0] === range[1] ? range[0] : null
    );
  }
  getThresholds(n = 0) {
    if (!n) n = this.regressionBins;
    const extent = this.range[1] - this.range[0];
    const step = extent / n;
    return range(n).map((i) => (i + 1) * step + this.range[0]);
  }
}
