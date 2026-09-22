import type { PerformanceSeriesPoint, RiskSnapshot } from "./trends.js";

export type MonthlyReportNarrative = {
  bullets: string[];
  momSummary: string;
  auditId: string;
};

export type MonthlyReportRiskColumns = {
  new: RiskSnapshot[];
  resolved: RiskSnapshot[];
  unchangedCount: number;
};

export type MonthlyReport = {
  period: string;
  title: string;
  subtitle: string;
  performance: PerformanceSeriesPoint[];
  narrative: MonthlyReportNarrative;
  riskRegister: MonthlyReportRiskColumns;
  compareLabel: string;
  generatedAt: string;
};
