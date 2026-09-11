export type Recommendation = "go" | "go_with_conditions" | "defer";
export type FindingSeverity = "info" | "warning" | "critical";

export type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  application: string;
  changeType: string;
  owner: string;
  status: string;
  plannedReleaseId: string;
  requestedAt: string;
};

export type Finding = {
  id: string;
  code: string;
  title: string;
  severity: FindingSeverity;
  reason: string;
  evidenceRefs: string[];
};

export type Incident = {
  id: string;
  application: string;
  title: string;
  severity: string;
  status: string;
  rootCause: string | null;
  openedAt: string;
  resolvedAt: string | null;
};

export type ProcessMetric = {
  application: string;
  processName: string;
  alertVolume: number;
  backlogCount: number;
  delayHours: number;
  timestamp: string;
};

export type PerformanceMetric = {
  application: string;
  metricName: string;
  value: number;
  unit: string;
  slaTarget: number;
  timestamp: string;
};

export type RiskRecord = {
  changeType: string;
  category: string;
  likelihood: number;
  impact: number;
  residualRisk: string;
  notes: string;
};

export type ReleasePlan = {
  id: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  freezeActive: boolean;
  auditPeriodActive: boolean;
  changeIds: string[];
};

export type DataQualityIssue = {
  source: string;
  field: string;
  missingRate: number;
  severity: string;
  notes: string;
};

export type MocReport = {
  change: ChangeRequest;
  recommendation: Recommendation;
  rationale: string;
  findings: Finding[];
  evidence: {
    incidents: Incident[];
    processMetrics: ProcessMetric[];
    performanceMetrics: PerformanceMetric[];
    riskRecord: RiskRecord | null;
    release: ReleasePlan | null;
    dataQuality: DataQualityIssue[];
  };
  caveats: string[];
  generatedAt: string;
};