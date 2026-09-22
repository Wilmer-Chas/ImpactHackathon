export type RiskSnapshot = {
  id: string;
  riskId: string;
  period: string;
  summary: string;
  state: "new" | "resolved" | "unchanged";
};

export type PerformanceSeriesPoint = {
  period: string;
  monthLabel: string;
  value: number;
  target: number;
  isAnomaly: boolean;
};

export type MonthlyReport = {
  period: string;
  title: string;
  subtitle: string;
  performance: PerformanceSeriesPoint[];
  narrative: {
    bullets: string[];
    momSummary: string;
    auditId: string;
  };
  riskRegister: {
    new: RiskSnapshot[];
    resolved: RiskSnapshot[];
    unchangedCount: number;
  };
  compareLabel: string;
  generatedAt: string;
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

export type ReportSchedule = {
  id: string;
  name: string;
  cadence: string;
  nextRun: string;
  enabled: boolean;
};
