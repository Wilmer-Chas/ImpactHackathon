import type { ChangeRequest } from "../domain/changeRequest.js";
import type { DataQualityIssue } from "../domain/dataQuality.js";
import type { Finding } from "../domain/finding.js";
import type { Incident } from "../domain/incident.js";
import type { PerformanceMetric, ProcessMetric } from "../domain/metrics.js";
import type { Recommendation } from "../domain/mocReport.js";
import type { ReleasePlan } from "../domain/release.js";
import type { RiskRecord } from "../domain/risk.js";

const BACKLOG_THRESHOLD = 500;
const DELAY_HOURS_THRESHOLD = 24;
const MISSING_RATE_THRESHOLD = 0.25;

function metricLabel(name: string): string {
  if (name.includes("success")) return "Job success rate";
  if (name.includes("latency")) return "Processing time";
  return name.replaceAll("_", " ");
}

export function evaluateFindings(input: {
  change: ChangeRequest;
  incidents: Incident[];
  processMetrics: ProcessMetric[];
  performanceMetrics: PerformanceMetric[];
  riskRecord: RiskRecord | null;
  release: ReleasePlan | null;
  dataQuality: DataQualityIssue[];
}): Finding[] {
  const findings: Finding[] = [];
  const { change, incidents, processMetrics, performanceMetrics, riskRecord, release, dataQuality } =
    input;

  const openHigh = incidents.filter(
    (i) => i.application === change.application && i.status === "open" && i.severity === "high",
  );
  if (openHigh.length > 0) {
    findings.push({
      id: "F-STABILITY",
      code: "stability_open_high_incident",
      title: "A serious incident is still open",
      severity: "critical",
      reason: `${openHigh[0].id}: ${openHigh[0].title}. It is safer to wait until this is fixed before changing ${change.application}.`,
      evidenceRefs: openHigh.map((i) => i.id),
    });
  }

  const appProcess = processMetrics.filter((m) => m.application === change.application);
  const overloaded = appProcess.filter(
    (m) => m.backlogCount >= BACKLOG_THRESHOLD || m.delayHours >= DELAY_HOURS_THRESHOLD,
  );
  if (overloaded.length > 0) {
    const m = overloaded[0];
    findings.push({
      id: "F-OPS-LOAD",
      code: "operational_load",
      title: "The team already has a large backlog",
      severity: "warning",
      reason: `${m.processName} has ${m.backlogCount} waiting items and is about ${m.delayHours} hours behind. Lowering thresholds may create even more alerts.`,
      evidenceRefs: [m.processName],
    });
  }

  if (riskRecord?.residualRisk === "high") {
    findings.push({
      id: "F-CHANGE-CLASS",
      code: "change_class_high_residual",
      title: "This kind of change is usually high risk",
      severity: "warning",
      reason: riskRecord.notes,
      evidenceRefs: [change.changeType],
    });
  }

  if (release && (release.freezeActive || release.auditPeriodActive)) {
    findings.push({
      id: "F-TIMING",
      code: "release_timing",
      title: release.freezeActive ? "Release is frozen right now" : "Release falls in an audit period",
      severity: release.freezeActive ? "critical" : "warning",
      reason: release.freezeActive
        ? `${release.name} is frozen from ${release.windowStart} to ${release.windowEnd}.`
        : `${release.name} runs from ${release.windowStart} to ${release.windowEnd}, during an audit. Reviewers will look at this more carefully.`,
      evidenceRefs: [release.id],
    });
  }

  const appPerf = performanceMetrics.filter((m) => m.application === change.application);
  for (const metric of appPerf) {
    const worse =
      metric.metricName.includes("success") || metric.metricName.includes("rate")
        ? metric.value < metric.slaTarget
        : metric.value > metric.slaTarget;
    if (worse) {
      const label = metricLabel(metric.metricName);
      const unit = metric.unit === "percent" ? "%" : ` ${metric.unit}`;
      findings.push({
        id: `F-PERF-${metric.metricName}`,
        code: "performance_sla_breach",
        title: `${label} is below target`,
        severity: "warning",
        reason: `Current value is ${metric.value}${unit}. The target is ${metric.slaTarget}${unit}.`,
        evidenceRefs: [metric.metricName],
      });
    }
  }

  const weakDq = dataQuality.filter((d) => d.missingRate >= MISSING_RATE_THRESHOLD);
  if (weakDq.length > 0) {
    const d = weakDq[0];
    findings.push({
      id: "F-DATA-QUALITY",
      code: "evidence_confidence",
      title: "Some evidence is incomplete",
      severity: "info",
      reason: `${(d.missingRate * 100).toFixed(0)}% of ${d.field} values are missing in ${d.source}. ${d.notes}`,
      evidenceRefs: [`${d.source}.${d.field}`],
    });
  }

  return findings;
}

export function rollupRecommendation(findings: Finding[]): {
  recommendation: Recommendation;
  rationale: string;
} {
  const hasCritical = findings.some((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");

  if (hasCritical) {
    return {
      recommendation: "defer",
      rationale:
        "Wait. There is still a serious open issue. Fix that first, then review this change again.",
    };
  }

  if (warnings.length >= 2) {
    return {
      recommendation: "go_with_conditions",
      rationale:
        "You can continue, but only with clear conditions: watch the system closely after release, keep a rollback plan ready, and accept the extra workload risk.",
    };
  }

  if (warnings.length === 1) {
    return {
      recommendation: "go_with_conditions",
      rationale: `You can continue if you handle this first: ${warnings[0].title}.`,
    };
  }

  return {
    recommendation: "go",
    rationale: "No major problems showed up in the checks. This change looks ready to proceed.",
  };
}

export function buildCaveats(dataQuality: DataQualityIssue[], findings: Finding[]): string[] {
  const caveats: string[] = [];
  for (const d of dataQuality.filter((x) => x.missingRate > 0)) {
    caveats.push(
      `${d.field} is missing in ${(d.missingRate * 100).toFixed(0)}% of ${d.source} records. ${d.notes}`,
    );
  }
  if (findings.some((f) => f.code === "evidence_confidence")) {
    caveats.push("Because some details are missing, treat this advice with a bit more caution.");
  }
  if (caveats.length === 0) {
    caveats.push("The supporting data for this review looks complete enough.");
  }
  return caveats;
}
