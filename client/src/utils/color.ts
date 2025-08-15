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
  pending: "text-neutral-content",
  paused: "text-neutral-content",
  auto_paused: "text-neutral-content",
  running: "text-success",
  reserved: "text-neutral-content",
  finished: "text-primary",
};

export const progressBadgeColor: Record<ExpStatus, string> = {
  pending: "badge bg-neutral-content text-gray-500",
  paused: "badge bg-neutral-content text-gray-500",
  auto_paused: "badge bg-neutral-content text-gray-500",
  running: "badge badge-success text-white",
  reserved: "badge bg-neutral-content text-gray-500",
  finished: "badge badge-primary text-white",
};

export const progressColor2 = {
  pending: "oklch(89.925% 0.016 262.749)",
  paused: "oklch(89.925% 0.016 262.749)",
  auto_paused: "oklch(89.925% 0.016 262.749)",
  running: "#82BF37",
  reserved: "oklch(89.925% 0.016 262.749)",
  finished: tableau10[0],
};
