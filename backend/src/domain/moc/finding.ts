export type FindingSeverity = "info" | "warning" | "critical";

export type Finding = {
  id: string;
  code: string;
  title: string;
  severity: FindingSeverity;
  reason: string;
  evidenceRefs: string[];
};