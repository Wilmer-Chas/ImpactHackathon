export type RiskSnapshotState = "new" | "resolved" | "unchanged";

export type RiskSnapshot = {
  id: string;
  riskId: string;
  period: string;
  summary: string;
  state: RiskSnapshotState;
};

export type PerformanceSeriesPoint = {
  period: string;
  monthLabel: string;
  value: number;
  target: number;
  isAnomaly: boolean;
};

export type TrendAnomaly = {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "crit";
  period: string;
  evidenceRefs: string[];
};

export type TrendsResponse = {
  anomalies: TrendAnomaly[];
  anomalyCount: number;
};
