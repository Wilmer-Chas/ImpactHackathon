export type PipelineRun = {
  monthLabel: string;
  monthKey: string;
  runs: number;
  flags: number;
};

export type AiModel = {
  id: string;
  name: string;
  sharePercent: number;
  enabled: boolean;
  sortOrder: number;
};

export type PiiFlagStatus = "pending" | "approved" | "redacted" | "rejected";

export type PiiFlag = {
  id: string;
  description: string;
  score: number;
  factors: string[];
  status: PiiFlagStatus;
  createdAt: string;
};

export type AdminKpis = {
  runs: number;
  scanned: number;
  flagged: number;
  activeUsers: number;
  approvedModels: number;
};

export type AdminOverview = {
  kpis: AdminKpis;
  runsSeries: PipelineRun[];
  models: AiModel[];
  flagged: PiiFlag[];
};

export type PiiFlagAction = "approve" | "redact" | "reject";
