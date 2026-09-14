import type { ChangeRequest } from "../change/changeRequest.js";
import type { DataQualityIssue } from "../ops/dataQuality.js";
import type { Finding } from "./finding.js";
import type { Incident } from "../incident/incident.js";
import type { PerformanceMetric, ProcessMetric } from "../ops/metrics.js";
import type { ReleasePlan } from "../ops/release.js";
import type { RiskRecord } from "../risk/risk.js";

export type Recommendation = "go" | "go_with_conditions" | "defer";

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
