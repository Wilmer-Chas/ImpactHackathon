export type FindingSeverity = "info" | "warning" | "critical";

export type Finding = {
  id: string;
  code: string;
  title: string;
  severity: FindingSeverity;
  reason: string;
  evidenceRefs: string[];
};

export type ChangeType = "rule_threshold" | "model_deploy" | "platform_release" | "data_feed";

export type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  application: string;
  changeType: ChangeType;
  owner: string;
  status: string;
  plannedReleaseId: string;
  requestedAt: string;
};

export type ResidualRisk = "low" | "medium" | "high";

export type Recommendation = "go" | "go_with_conditions" | "defer";

export type MocMeeting = {
  title: string;
  portfolio: string;
  preparedBy: string;
  preparedAt: string;
};

export type OpenIncidentSignal = {
  id: string;
  application: string;
  title: string;
  severity: string;
};

export type ResidualRiskClass = {
  changeType: ChangeType;
  category: string;
  residualRisk: ResidualRisk;
};

export type ReleaseSignal = {
  id: string;
  name: string;
  freezeActive: boolean;
  auditPeriodActive: boolean;
  windowStart: string;
  windowEnd: string;
};

export type WorkloadSignal = {
  application: string;
  processName: string;
  backlogCount: number;
  delayHours: number;
};

export type HealthSignal = {
  application: string;
  metricName: string;
  value: number;
  unit: string;
  slaTarget: number;
  belowSla: boolean;
};

export type DataQualitySignal = {
  source: string;
  field: string;
  severity: string;
  notes: string;
};

export type OrgRiskPosture = {
  openHighSeverityIncidents: OpenIncidentSignal[];
  residualRiskByChangeClass: ResidualRiskClass[];
  release: ReleaseSignal | null;
  workloadPressure: WorkloadSignal[];
  healthPressure: HealthSignal[];
  dataQualityCaveats: DataQualitySignal[];
};

export type PostureSignal = {
  id: string;
  headline: string;
  detail: string;
  severity: FindingSeverity;
  evidenceRefs: string[];
};

export type BriefingNarrative = {
  titleSummary: string;
  postureSummary: string;
  postureSignals: PostureSignal[];
  agendaIntro: string;
  agendaNotes: Record<string, string>;
};

export type AgendaItem = {
  changeId: string;
  title: string;
  application: string;
  changeType: ChangeType;
  residualRisk: ResidualRisk | null;
  status: string;
  agendaStatus: "needs_moc_stance";
};

export type MocBriefing = {
  meeting: MocMeeting;
  posture: OrgRiskPosture;
  narrative: BriefingNarrative;
  agenda: AgendaItem[];
  generatedAt: string;
};

export type MocReport = {
  change: ChangeRequest;
  recommendation: Recommendation;
  rationale: string;
  findings: Finding[];
  evidence: {
    incidents: unknown[];
    processMetrics: unknown[];
    performanceMetrics: unknown[];
    riskRecord: unknown | null;
    release: unknown | null;
    dataQuality: unknown[];
  };
  caveats: string[];
  generatedAt: string;
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  go: "Authorize",
  go_with_conditions: "Authorize, with conditions",
  defer: "Hold",
};
