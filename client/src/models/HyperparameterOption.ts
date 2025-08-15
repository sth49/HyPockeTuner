/* eslint-disable @typescript-eslint/no-explicit-any */
import { HyperparamTypes } from "../types/hyperparameter";

export class HyperparamOption {
  public type!: HyperparamTypes;
  public displayName: string;
  selected: boolean = true;
  selectedType: any;
  tp: string = "value";
  choices: any[] = [];

  constructor(public name: string, public index: number) {
    this.displayName = name;
  }

  static fromJSON(name: string, index: number, json: any) {
    let hparam: HyperparamOption;
    if (json.type === "ordinal") {
      hparam = new OrderedHyperparamOption(
        name,
        index,
        "ordinal",
        json.range,
        json.values
      );
    } else if (json.type === "uniform") {
      hparam = new OrderedHyperparamOption(
        name,
        index,
        "uniform",
        json.range,
        json.values
      );
    } else if (json.type === "unordered") {
      hparam = new UnorderedHyperparamOption(
        name,
        index,
        json.values,
        "unordered"
      );
    } else {
      throw new Error("Unknown hyperparameter type");
    }

    if (json.displayName) hparam.displayName = json.displayName;
    return hparam;
  }
  toJSON() {
    // pass
  }

  initialize(_data: any, _type: any) {
    // pass
  }
}

export class OrderedHyperparamOption extends HyperparamOption {
  range0: string;
  range1: string;
  errorChoice: boolean = false;
  error0: boolean = false;
  error1: boolean = false;
  newChoice: string = "";
  constant: string = "";
  newConstant: string = "";
  tp: string = "value";
  // setChoice: string = "";
  // activeChoices: any[] = [];
  //   selectedType: string

  constructor(
    public name: string,
    public index: number,
    public selectedType: string,
    public range: number[],
    public choices: number[]
  ) {
    super(name, index);
    this.range0 = range[0].toString();
    this.range1 = range[1].toString();
    this.constant = choices[0].toString();
    this.newConstant = this.constant;
    if (this.selectedType === "uniform") {
      this.tp = "range";
    }
  }

  initialize(data: any, type: HyperparamTypes): void {
    console.log("data:", data);
    console.log("type:", type);
    if (data) {
      if (data.length === 1) {
        this.selectedType = "constant";
        this.tp = "value";
        this.range0 = data[0].toString();
        this.range1 = data[0].toString();
        this.constant = data[0].toString();
        this.newConstant = this.constant;
        this.range = [data[0], data[0]];
        this.choices = [data[0]];
      } else if (type === HyperparamTypes.Uniform) {
        this.selectedType = "uniform";
        this.tp = "range";
        this.range0 = Math.min(...data).toString();
        this.range1 = Math.max(...data).toString();
        this.choices = [Math.min(...data), Math.max(...data)];
        this.constant = data[0].toString();
        this.newConstant = this.constant;
      } else if (type === HyperparamTypes.Ordinal) {
        this.selectedType = "ordinal";
        this.tp = "value";
        this.range0 = Math.min(...data).toString();
        this.range1 = Math.max(...data).toString();
        this.choices = data;
        this.constant = data[0].toString();
        this.newConstant = this.constant;
      }
    }
  }
  checkConstant() {
    const numConstant = +this.newConstant;
    if (isNaN(numConstant) || numConstant < 0) {
      return false;
    } else {
      return true;
    }
  }
  changeConstant() {
    if (this.checkConstant()) {
      this.constant = this.newConstant;
      this.newConstant = "";
    }
  }
  checkChoice() {
    const numChoice = +this.newChoice;
    if (isNaN(numChoice) || numChoice < 0 || this.choices.includes(numChoice)) {
      return false;
    } else {
      return true;
    }
  }
  addChoice() {
    if (this.checkChoice()) {
      this.choices.push(+this.newChoice);
      this.choices.sort((a, b) => a - b);
      if (this.choices.length > 1) {
        this.selected = true;
        this.selectedType = "ordinal";
      }
      this.newChoice = "";
    }
  }
  deleteChoice(value: number) {
    if (this.choices.length === 1) {
      return;
    }
    this.choices = this.choices.filter((c) => c !== value);
    if (this.choices.length === 1) {
      this.selected = false;
      this.selectedType = "constant";
    }
  }
  checkRange(tp: number) {
    console.log("this.range0", this.range0);
    console.log("this.range1", this.range1);
    if (this.range0 === this.range1) {
      this.selected = false;
    } else {
      this.selected = true;
    }
    if (
      isNaN(+this.range0) ||
      isNaN(+this.range1) ||
      +this.range0 >= +this.range1
    ) {
      if (tp === 0) this.error0 = true;
      else this.error1 = true;
      // return false;
    } else {
      if (tp === 0) this.error0 = false;
      else this.error1 = false;
    }
  }
  toJSON() {
    if (this.selectedType === "constant") {
      return {
        name: this.name,
        displayName: this.displayName,
        type: "ordered",
        values: this.choices,
        selected: false,
      };
    } else if (this.selectedType === "ordinal") {
      return {
        name: this.name,
        displayName: this.displayName,
        type: "ordered",
        values: this.selected ? this.choices : [+this.range0],
        selected: true,
      };
    } else {
      return {
        name: this.name,
        displayName: this.displayName,
        type: "uniform",
        range: [+this.range0, +this.range1],
        selected: true,
      };
    }
  }
}

export class UnorderedHyperparamOption extends HyperparamOption {
  type = HyperparamTypes.Unordered;
  activeChoices: any[] = [];
  setChoiceValue: string = "";
  constant: string = "";
  constructor(
    public name: string,
    public index: number,
    public choices: any[],
    public selectedType: string
  ) {
    super(name, index);
    choices.map((c) => {
      this.activeChoices.push(c);
    });

    this.setChoiceValue =
      this.activeChoices[0] === true
        ? "True"
        : this.activeChoices[0] === false
        ? "False"
        : this.activeChoices[0];

    this.constant = this.setChoiceValue;
  }
  initialize(data: any, _type: any): void {
    this.activeChoices = data;
    this.setChoiceValue =
      this.activeChoices[0] === true
        ? "True"
        : this.activeChoices[0] === false
        ? "False"
        : this.activeChoices[0];

    this.constant = this.setChoiceValue;
    if (this.activeChoices.length === 1) {
      this.selected = false;
      this.selectedType = "constant";
    }
  }
  deleteChoice(value: any) {
    if (this.activeChoices.length === 1) {
      return;
    }
    this.activeChoices = this.activeChoices.filter((c) => c !== value);
    if (this.activeChoices.length === 1) {
      this.selected = false;
      this.selectedType = "constant";
    }
  }
  addChoice(value: any) {
    this.activeChoices.push(value);
    this.selectedType = "unordered";
    if (this.activeChoices.length > 1) {
      this.selected = true;
    }
  }
  toJSON() {
    if (this.selectedType === "constant") {
      return {
        name: this.name,
        displayName: this.displayName,
        type: "unordered",
        values: [
          this.constant === "True"
            ? true
            : this.constant === "False"
            ? false
            : this.constant,
        ],
        selected: false,
      };
    } else {
      return {
        name: this.name,
        displayName: this.displayName,
        type: "unordered",
        values: this.selected
          ? this.activeChoices
          : [
              this.setChoiceValue === "True"
                ? true
                : this.setChoiceValue === "False"
                ? false
                : this.setChoiceValue,
            ],
        selected: true,
      };
    }
  }
  setChoice(value: string) {
    this.setChoiceValue = value;
  }
}
