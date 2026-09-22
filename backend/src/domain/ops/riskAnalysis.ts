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
