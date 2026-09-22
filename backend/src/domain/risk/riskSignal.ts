export type RiskSignalSourceType =
  | "incident"
  | "data_quality"
  | "ops_alert"
  | "customer_note";

export type RiskSignalSeverity = "low" | "medium" | "high";

/** Normalized multi-source signal used only by risk intelligence clustering. */
export type RiskSignal = {
  sourceType: RiskSignalSourceType;
  id: string;
  theme: string;
  tags: string[];
  severity: RiskSignalSeverity;
  category: string;
  application: string;
  title: string;
  status: "open" | "resolved" | "unknown";
  /** ISO date (YYYY-MM-DD) when the signal started / was recorded. */
  occurredAt: string | null;
  /** ISO date when resolved (issue-layer / Jira later). Null if still open. */
  resolvedAt: string | null;
};
