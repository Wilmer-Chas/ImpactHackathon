export type OpsAlertSeverity = "low" | "medium" | "high";
export type OpsAlertStatus = "open" | "resolved";

export type OpsAlert = {
  id: string;
  application: string;
  title: string;
  severity: OpsAlertSeverity;
  status: OpsAlertStatus;
  theme: string;
  tags: string[];
  category: string;
  openedAt: string;
  sourceSystem: string;
};
