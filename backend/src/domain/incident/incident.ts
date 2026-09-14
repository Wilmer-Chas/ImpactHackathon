export type IncidentSeverity = "low" | "medium" | "high";
export type IncidentStatus = "open" | "resolved";

export type Incident = {
  id: string;
  application: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  rootCause: string | null;
  openedAt: string;
  resolvedAt: string | null;
};