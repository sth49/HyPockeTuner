import { ExpStatus } from "../types";

export const tableau10 = [
  "#4E79A7",
  "#F28E2B",
  "#E15759",
  "#76B7B2",
  "#59A14F",
  "#EDC948",
  "#B07AA1",
  "#FF9DA7",
  "#9C755F",
  "#BAB0AC",
];

export const progressColor: Record<ExpStatus, string> = {
  pending: "text-neutral-500",
  paused: "text-neutral-500",
  auto_paused: "text-neutral-500",
  running: "text-success",
  reserved: "text-neutral",
  finished: "text-primary",
};

export const progressBadgeColor: Record<ExpStatus, string> = {
  pending: "badge badge-neutral",
  paused: "badge badge-neutral",
  auto_paused: "badge badge-neutral",
  running: "badge badge-success",
  reserved: "badge badge-neutral",
  finished: "badge badge-primary",
};

export const progressColor2 = {
  pending: "grey",
  paused: "grey",
  auto_paused: "grey",
  running: "#82BF37",
  reserved: "grey",
  finished: tableau10[0],
};
