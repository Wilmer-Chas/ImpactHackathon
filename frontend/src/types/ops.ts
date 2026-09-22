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

export type EnterpriseRiskLevel = "High" | "Med" | "Low";

export type EnterpriseRiskItem = {
  id: string;
  name: string;
  category: string;
  likelihood: EnterpriseRiskLevel;
  impact: EnterpriseRiskLevel;
  owner: string;
  description: string;
  evidenceCount: number;
  evidenceRefs: string[];
  sourceTypes: string[];
};

export type RiskCategorySlice = {
  name: string;
  value: number;
  color: string;
};

export type RiskAnalysisPeriod = {
  from: string;
  to: string;
};

export type RiskAnalysisReport = {
  title: string;
  subtitle: string;
  period: RiskAnalysisPeriod;
  generatedAt: string;
  categories: RiskCategorySlice[];
  itemsByCategory: Record<string, EnterpriseRiskItem[]>;
  summaryBullets: string[];
  momSummary: string;
  auditId: string;
  sourceLabels: string[];
  signalCount: number;
};
