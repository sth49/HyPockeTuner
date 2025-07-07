/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 공통 타입 정의 파일
 */

import { TrialState } from "../../types/experiment";

// 방향 타입
export type Direction = "ltr" | "rtl";

export type NodePosition =
  | "ltr-start"
  | "ltr-end"
  | "rtl-start"
  | "rtl-end"
  | "ltr-middle"
  | "rtl-middle";

export type BandType = "node" | "link";
// 노드 타입
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

// 경계 반경 문자열
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

// 이벤트 데이터 타입
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

// 사이즈 인터페이스
export interface Sizes {
  bandWidth: number;
  bandHeight: number;
  nodeWidth: number;
  nodeHeight: number;
  linkWidth: number;
  gap: number;
  eventWidth: number;
}

// 브라켓 인터페이스
export interface Bracket {
  id: number;
  startTime: number | null;
  rounds: Round[];
}

// 라운드 인터페이스
export interface Round {
  id: number;
  trials: Trial[];
}

// 트라이얼 인터페이스
export interface Trial {
  trialId: string;
  startTime: number | null;
  endTime: number | null;
  metric: number;
}

// 실험 스토어 상태 인터페이스
export interface ExperimentState {
  brackets: Bracket[];
}
