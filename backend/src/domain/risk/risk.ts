import type { ChangeType } from "../change/changeRequest.js";

export type ResidualRisk = "low" | "medium" | "high";

export type RiskRecord = {
  changeType: ChangeType;
  category: string;
  likelihood: number;
  impact: number;
  residualRisk: ResidualRisk;
  notes: string;
};
