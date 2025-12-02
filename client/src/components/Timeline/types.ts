/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 
 */

import { TrialState } from "../../types/experiment";


export type Direction = "ltr" | "rtl";

export type NodePosition =
  | "ltr-start"
  | "ltr-end"
  | "rtl-start"
  | "rtl-end"
  | "ltr-middle"
  | "rtl-middle";

export type BandType = "node" | "link";

export type NodeType =
  | "pseudo"
  | "start"
  | "link"
  | "trial"
  | "user"
  | "merged"
  | "current"
  | "failed"
  | "paused";


export type BorderRadiusString = string;

export type BandProps = {
  type: BandType;
  bracket: number;
  startTime: number;
  endTime: number;
  order: number;
  data: NodeProps | LinkProps | null;
  prev: BandProps | null;
  next: BandProps | null;
};

export type NodeProps = {
  type: NodeType;
  trials: TrialState[];
};
export type LinkProps = {
  type: NodeType;
  trials: TrialState[];
  events: EventData[];
};


export interface EventData {
  time: number | null;
  type: string;
  data?: any;
  icon?: React.ComponentType;
}

export interface LayoutRow {
  rowIndex: number;
  nodes: BandProps[];
  horizontalLinks: BandProps[];
  verticalLink: BandProps | null;
  direction: Direction;
}


export interface Sizes {
  bandWidth: number;
  bandHeight: number;
  nodeWidth: number;
  nodeHeight: number;
  linkWidth: number;
  linkHeight?: number;
  gap: number;
  eventWidth: number;
}


export interface Bracket {
  id: number;
  startTime: number | null;
  rounds: Round[];
}


export interface Round {
  id: number;
  trials: Trial[];
}


export interface Trial {
  trialId: string;
  startTime: number | null;
  endTime: number | null;
  metric: number;
}


export interface ExperimentState {
  brackets: Bracket[];
}
