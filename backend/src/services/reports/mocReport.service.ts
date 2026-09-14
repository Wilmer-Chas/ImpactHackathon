import type {
  ChangeRequest,
  DataQualityIssue,
  Incident,
  MocReport,
  PerformanceMetric,
  ProcessMetric,
  ReleasePlan,
  RiskRecord,
} from "../../domain/index.js";
import { toChangeRequest } from "../../models/change/changeRequest.model.js";
import { toIncident } from "../../models/incident/incident.model.js";
import { loadFixture } from "../../utils/fixtures/loadFixture.js";
import { buildCaveats, evaluateFindings, rollupRecommendation } from "./riskRules.service.js";

export class MocReportService {
  getByChangeId(changeId: string): MocReport | null {
    const changeRaw = loadFixture<ChangeRequest>("changes/change-1001.json");
    if (changeRaw.id !== changeId) {
      return null;
    }

    const change = toChangeRequest(changeRaw);
    const incidents = loadFixture<Incident[]>("incidents/incidents.json")
      .map(toIncident)
      .filter((i) => i.application === change.application);
    const processMetrics = loadFixture<ProcessMetric[]>("ops/process-metrics.json").filter(
      (m) => m.application === change.application,
    );
    const performanceMetrics = loadFixture<PerformanceMetric[]>("ops/performance-metrics.json").filter(
      (m) => m.application === change.application,
    );
    const riskRegister = loadFixture<RiskRecord[]>("risk/risk-register.json");
    const riskRecord = riskRegister.find((r) => r.changeType === change.changeType) ?? null;
    const release = loadFixture<ReleasePlan>("ops/release-plan.json");
    const releaseForChange = release.changeIds.includes(change.id) ? release : null;
    const dataQuality = loadFixture<DataQualityIssue[]>("quality/data-quality.json");

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
