export type TrialRowType = {
  id: string;
  event: string;
  loss: string;
  metric: string;
  budget: number;
  start?: number;
  end?: number;
  [key: string]: any;
};
