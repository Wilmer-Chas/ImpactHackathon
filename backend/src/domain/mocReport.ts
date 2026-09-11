import type { ChangeRequest } from "./changeRequest.js";
import type { DataQualityIssue } from "./dataQuality.js";
import type { Finding } from "./finding.js";
import type { Incident } from "./incident.js";
import type { PerformanceMetric, ProcessMetric } from "./metrics.js";
import type { ReleasePlan } from "./release.js";
import type { RiskRecord } from "./risk.js";

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