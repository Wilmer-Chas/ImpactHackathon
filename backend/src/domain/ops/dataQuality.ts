export type DataQualityIssue = {
  source: string;
  field: string;
  missingRate: number;
  severity: "low" | "medium" | "high";
  notes: string;
};