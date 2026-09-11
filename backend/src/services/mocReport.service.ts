import type { ChangeRequest } from "../domain/changeRequest.js";
import type { DataQualityIssue } from "../domain/dataQuality.js";
import type { Incident } from "../domain/incident.js";
import type { PerformanceMetric, ProcessMetric } from "../domain/metrics.js";
import type { MocReport } from "../domain/mocReport.js";
import type { ReleasePlan } from "../domain/release.js";
import type { RiskRecord } from "../domain/risk.js";
import { toChangeRequest } from "../models/changeRequest.model.js";
import { toIncident } from "../models/incident.model.js";
import { loadFixture } from "../utils/loadFixture.js";
import { buildCaveats, evaluateFindings, rollupRecommendation } from "./riskRules.service.js";

export class MocReportService {
  getByChangeId(changeId: string): MocReport | null {
    const changeRaw = loadFixture<ChangeRequest>("change-1001.json");
    if (changeRaw.id !== changeId) {
      return null;
    }

    const change = toChangeRequest(changeRaw);
    const incidents = loadFixture<Incident[]>("incidents.json")
      .map(toIncident)
      .filter((i) => i.application === change.application);
    const processMetrics = loadFixture<ProcessMetric[]>("process-metrics.json").filter(
      (m) => m.application === change.application,
    );
    const performanceMetrics = loadFixture<PerformanceMetric[]>("performance-metrics.json").filter(
      (m) => m.application === change.application,
    );
    const riskRegister = loadFixture<RiskRecord[]>("risk-register.json");
    const riskRecord = riskRegister.find((r) => r.changeType === change.changeType) ?? null;
    const release = loadFixture<ReleasePlan>("release-plan.json");
    const releaseForChange = release.changeIds.includes(change.id) ? release : null;
    const dataQuality = loadFixture<DataQualityIssue[]>("data-quality.json");

    const findings = evaluateFindings({
      change,
      incidents,
      processMetrics,
      performanceMetrics,
      riskRecord,
      release: releaseForChange,
      dataQuality,
    });
    const { recommendation, rationale } = rollupRecommendation(findings);

    return {
      change,
      recommendation,
      rationale,
      findings,
      evidence: {
        incidents,
        processMetrics,
        performanceMetrics,
        riskRecord,
        release: releaseForChange,
        dataQuality,
      },
      caveats: buildCaveats(dataQuality, findings),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mocReportService = new MocReportService();