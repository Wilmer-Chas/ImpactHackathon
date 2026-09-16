import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChangeRequest } from "../../domain/change/changeRequest.js";
import type {
  AgendaItem,
  MocBriefing,
  OrgRiskPosture,
} from "../../domain/moc/briefing.js";
import type { DataQualityIssue } from "../../domain/ops/dataQuality.js";
import type { PerformanceMetric, ProcessMetric } from "../../domain/ops/metrics.js";
import type { ReleasePlan } from "../../domain/ops/release.js";
import type { Incident } from "../../domain/incident/incident.js";
import type { RiskRecord } from "../../domain/risk/risk.js";
import { toChangeRequest } from "../../models/change/changeRequest.model.js";
import { toIncident } from "../../models/incident/incident.model.js";
import { loadFixture } from "../../utils/fixtures/loadFixture.js";
import { authorBriefingNarrative } from "../ai/briefingIntelligence.service.js";

const AGENDA_CHANGE_IDS = ["1001", "1002", "1003"] as const;

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures");

function tryLoadChange(changeId: string): ChangeRequest | null {
  const relative = `changes/change-${changeId}.json`;
  const absolute = join(fixturesDir, relative);
  if (!existsSync(absolute)) {
    return null;
  }
  const raw = loadFixture<ChangeRequest>(relative);
  if (raw.id !== changeId) {
    return null;
  }
  return toChangeRequest(raw);
}

function buildPosture(): OrgRiskPosture {
  const incidents = loadFixture<Incident[]>("incidents/incidents.json").map(toIncident);
  const processMetrics = loadFixture<ProcessMetric[]>("ops/process-metrics.json");
  const performanceMetrics = loadFixture<PerformanceMetric[]>("ops/performance-metrics.json");
  const riskRegister = loadFixture<RiskRecord[]>("risk/risk-register.json");
  const release = loadFixture<ReleasePlan>("ops/release-plan.json");
  const dataQuality = loadFixture<DataQualityIssue[]>("quality/data-quality.json");

  const openHighSeverityIncidents = incidents
    .filter((incident) => incident.status === "open" && incident.severity === "high")
    .map((incident) => ({
      id: incident.id,
      application: incident.application,
      title: incident.title,
      severity: incident.severity,
    }));

  const residualRiskByChangeClass = riskRegister.map((record) => ({
    changeType: record.changeType,
    category: record.category,
    residualRisk: record.residualRisk,
  }));

  const workloadPressure = processMetrics
    .filter((metric) => metric.backlogCount > 0 || metric.delayHours > 0)
    .map((metric) => ({
      application: metric.application,
      processName: metric.processName,
      backlogCount: metric.backlogCount,
      delayHours: metric.delayHours,
    }));

  const healthPressure = performanceMetrics
    .filter((metric) => metric.value < metric.slaTarget || metric.metricName.includes("latency"))
    .map((metric) => ({
      application: metric.application,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      slaTarget: metric.slaTarget,
      belowSla:
        metric.metricName.includes("latency")
          ? metric.value > metric.slaTarget
          : metric.value < metric.slaTarget,
    }))
    .filter((metric) => metric.belowSla);

  const dataQualityCaveats = dataQuality
    .filter((issue) => issue.missingRate > 0 || issue.severity !== "low")
    .map((issue) => ({
      source: issue.source,
      field: issue.field,
      severity: issue.severity,
      notes: issue.notes,
    }));

  return {
    openHighSeverityIncidents,
    residualRiskByChangeClass,
    release: {
      id: release.id,
      name: release.name,
      freezeActive: release.freezeActive,
      auditPeriodActive: release.auditPeriodActive,
      windowStart: release.windowStart,
      windowEnd: release.windowEnd,
    },
    workloadPressure,
    healthPressure,
    dataQualityCaveats,
  };
}

function buildAgenda(riskRegister: RiskRecord[]): AgendaItem[] {
  const agenda: AgendaItem[] = [];

  for (const changeId of AGENDA_CHANGE_IDS) {
    const change = tryLoadChange(changeId);
    if (!change) {
      continue;
    }
    const risk = riskRegister.find((record) => record.changeType === change.changeType) ?? null;
    agenda.push({
      changeId: change.id,
      title: change.title,
      application: change.application,
      changeType: change.changeType,
      residualRisk: risk?.residualRisk ?? null,
      status: change.status,
      agendaStatus: "needs_moc_stance",
    });
  }

  return agenda;
}

export class MocBriefingService {
  async getBriefing(): Promise<MocBriefing> {
    const riskRegister = loadFixture<RiskRecord[]>("risk/risk-register.json");
    const posture = buildPosture();
    const agenda = buildAgenda(riskRegister);

    const meeting = {
      title: "TM Portfolio — Management Oversight Committee",
      portfolio: "Transaction Monitoring",
      preparedBy: "Alex Rivera (TM Product Owner)",
      preparedAt: "2026-09-16",
    };

    const narrative = await authorBriefingNarrative({
      meeting,
      posture,
      agenda: agenda.map((item) => ({
        changeId: item.changeId,
        title: item.title,
        application: item.application,
        changeType: item.changeType,
        residualRisk: item.residualRisk,
        status: item.status,
      })),
    });

    return {
      meeting,
      posture,
      narrative,
      agenda,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mocBriefingService = new MocBriefingService();
