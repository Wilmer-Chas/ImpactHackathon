import type { ChangeRequest } from "../../domain/change/changeRequest.js";
import type {
  DataQualityIssue,
  Incident,
  PerformanceMetric,
  ProcessMetric,
  ReleasePlan,
  RiskRecord,
} from "../../domain/index.js";
import type { EvidencePack } from "../ai/mocIntelligence.service.js";
import type { PortfolioEvidencePack } from "../ai/briefingIntelligence.service.js";
import { cosineSimilarity, embedTexts } from "../ai/embeddings.client.js";
import type { EntityType } from "../../db/types.js";
import * as evidenceRepo from "../../repository/index.js";

function getTopK(): number {
  const raw = Number(process.env.RAG_TOP_K ?? 12);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 12;
}

type RetrievedRef = {
  entityType: EntityType;
  entityId: string;
  score: number;
};

async function retrieveTopRefs(query: string, topK: number): Promise<RetrievedRef[]> {
  const [queryEmbedding] = await embedTexts([query]);
  if (!queryEmbedding) {
    return [];
  }

  const chunks = evidenceRepo.listEmbeddedChunks();
  const scored: RetrievedRef[] = [];

  for (const chunk of chunks) {
    if (!chunk.embedding) {
      continue;
    }
    scored.push({
      entityType: chunk.entityType,
      entityId: chunk.entityId,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function uniqueRefs(refs: RetrievedRef[]): RetrievedRef[] {
  const seen = new Set<string>();
  const out: RetrievedRef[] = [];
  for (const ref of refs) {
    const key = `${ref.entityType}:${ref.entityId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function mergeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeProcessMetrics(items: ProcessMetric[]): ProcessMetric[] {
  const map = new Map<string, ProcessMetric>();
  for (const item of items) {
    map.set(`${item.application}|${item.processName}|${item.timestamp}`, item);
  }
  return [...map.values()];
}

function mergePerformanceMetrics(items: PerformanceMetric[]): PerformanceMetric[] {
  const map = new Map<string, PerformanceMetric>();
  for (const item of items) {
    map.set(`${item.application}|${item.metricName}|${item.timestamp}`, item);
  }
  return [...map.values()];
}

function mergeRiskRecords(items: RiskRecord[]): RiskRecord[] {
  const map = new Map<string, RiskRecord>();
  for (const item of items) {
    map.set(item.changeType, item);
  }
  return [...map.values()];
}

function mergeDataQuality(items: DataQualityIssue[]): DataQualityIssue[] {
  const map = new Map<string, DataQualityIssue>();
  for (const item of items) {
    map.set(`${item.source}|${item.field}`, item);
  }
  return [...map.values()];
}

function resolveEvidenceFromRefs(refs: RetrievedRef[]): {
  incidents: Incident[];
  processMetrics: ProcessMetric[];
  performanceMetrics: PerformanceMetric[];
  riskRecords: RiskRecord[];
  releases: ReleasePlan[];
  dataQuality: DataQualityIssue[];
} {
  const incidents: Incident[] = [];
  const processMetrics: ProcessMetric[] = [];
  const performanceMetrics: PerformanceMetric[] = [];
  const riskRecords: RiskRecord[] = [];
  const releases: ReleasePlan[] = [];
  const dataQuality: DataQualityIssue[] = [];

  for (const ref of uniqueRefs(refs)) {
    switch (ref.entityType) {
      case "incident": {
        const incident = evidenceRepo.getIncidentById(ref.entityId);
        if (incident) incidents.push(incident);
        break;
      }
      case "process_metric": {
        const metric = evidenceRepo.getProcessMetricByEntityId(ref.entityId);
        if (metric) processMetrics.push(metric);
        break;
      }
      case "performance_metric": {
        const metric = evidenceRepo.getPerformanceMetricByEntityId(ref.entityId);
        if (metric) performanceMetrics.push(metric);
        break;
      }
      case "risk": {
        const risk = evidenceRepo.getRiskByChangeType(ref.entityId);
        if (risk) riskRecords.push(risk);
        break;
      }
      case "release": {
        const release = evidenceRepo.getReleaseById(ref.entityId);
        if (release) releases.push(release);
        break;
      }
      case "data_quality": {
        const issue = evidenceRepo.getDataQualityByEntityId(ref.entityId);
        if (issue) dataQuality.push(issue);
        break;
      }
      default:
        break;
    }
  }

  return {
    incidents,
    processMetrics,
    performanceMetrics,
    riskRecords,
    releases,
    dataQuality,
  };
}

/** Decision-brief evidence: RAG retrieve + always include risk/release for the anchor change. */
export async function retrieveEvidencePackForChange(
  change: ChangeRequest,
): Promise<EvidencePack> {
  const query = [
    `Decision brief for change ${change.id}`,
    `title: ${change.title}`,
    `description: ${change.description}`,
    `application: ${change.application}`,
    `changeType: ${change.changeType}`,
    `status: ${change.status}`,
  ].join("\n");

  const refs = await retrieveTopRefs(query, getTopK());
  const resolved = resolveEvidenceFromRefs(refs);

  const riskRecord =
    evidenceRepo.getRiskByChangeType(change.changeType) ??
    resolved.riskRecords.find((r) => r.changeType === change.changeType) ??
    null;

  const release =
    evidenceRepo.getReleaseForChange(change.id) ??
    resolved.releases.find((r) => r.changeIds.includes(change.id)) ??
    null;

  const openOnApp = evidenceRepo
    .listIncidentsByApplication(change.application)
    .filter((i) => i.status === "open");

  const incidents = mergeById([
    ...resolved.incidents.filter((i) => i.application === change.application),
    ...openOnApp,
  ]);

  const processMetrics = mergeProcessMetrics([
    ...resolved.processMetrics.filter((m) => m.application === change.application),
    ...evidenceRepo.listProcessMetricsByApplication(change.application),
  ]);

  const performanceMetrics = mergePerformanceMetrics([
    ...resolved.performanceMetrics.filter((m) => m.application === change.application),
    ...evidenceRepo.listPerformanceMetricsByApplication(change.application),
  ]);

  const dataQuality = mergeDataQuality([
    ...resolved.dataQuality,
    ...evidenceRepo.listAllDataQuality(),
  ]);

  return {
    incidents,
    processMetrics,
    performanceMetrics,
    riskRecord,
    release,
    dataQuality,
  };
}

const AGENDA_CHANGE_IDS = ["1001", "1002", "1003"] as const;

/** Portfolio briefing: RAG over meeting context + agenda anchors. */
export async function retrievePortfolioEvidenceForBriefing(): Promise<{
  pack: PortfolioEvidencePack;
  riskRegister: RiskRecord[];
  agendaChanges: ChangeRequest[];
}> {
  const meeting = {
    title: "TM Portfolio — Management Oversight Committee",
    portfolio: "Transaction Monitoring",
    preparedBy: "Alex Rivera (TM Product Owner)",
    preparedAt: "2026-09-16",
  };

  const agendaChanges = evidenceRepo.listChangesByIds([...AGENDA_CHANGE_IDS]);
  const riskRegister = evidenceRepo.listAllRiskRecords();
  const release = evidenceRepo.getPrimaryRelease();

  const query = [
    `MOC briefing for ${meeting.portfolio}`,
    `meeting: ${meeting.title}`,
    `agenda changes: ${agendaChanges
      .map((c) => `${c.id} ${c.title} ${c.application} ${c.changeType}`)
      .join("; ")}`,
    `focus: open high severity incidents, residual risk, release freeze/audit, workload backlog, SLA health, data quality`,
  ].join("\n");

  const refs = await retrieveTopRefs(query, getTopK());
  const resolved = resolveEvidenceFromRefs(refs);

  const incidents = mergeById([
    ...resolved.incidents,
    ...evidenceRepo.listAllIncidents().filter((i) => i.status === "open" && i.severity === "high"),
  ]);
  const processMetrics = mergeProcessMetrics([
    ...resolved.processMetrics,
    ...evidenceRepo.listAllProcessMetrics().filter((m) => m.backlogCount > 0 || m.delayHours > 0),
  ]);
  const performanceMetrics = mergePerformanceMetrics([
    ...resolved.performanceMetrics,
    ...evidenceRepo.listAllPerformanceMetrics(),
  ]);
  const dataQuality = mergeDataQuality([
    ...resolved.dataQuality,
    ...evidenceRepo.listAllDataQuality(),
  ]);
  const risks = mergeRiskRecords([...resolved.riskRecords, ...riskRegister]);

  const openHighSeverityIncidents = incidents
    .filter((incident) => incident.status === "open" && incident.severity === "high")
    .map((incident) => ({
      id: incident.id,
      application: incident.application,
      title: incident.title,
      severity: incident.severity,
    }));

  const residualRiskByChangeClass = risks.map((record) => ({
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
      belowSla: metric.metricName.includes("latency")
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

  const posture = {
    openHighSeverityIncidents,
    residualRiskByChangeClass,
    release: release
      ? {
          id: release.id,
          name: release.name,
          freezeActive: release.freezeActive,
          auditPeriodActive: release.auditPeriodActive,
          windowStart: release.windowStart,
          windowEnd: release.windowEnd,
        }
      : null,
    workloadPressure,
    healthPressure,
    dataQualityCaveats,
  };

  const agenda = agendaChanges.map((change) => {
    const risk = riskRegister.find((record) => record.changeType === change.changeType) ?? null;
    return {
      changeId: change.id,
      title: change.title,
      application: change.application,
      changeType: change.changeType,
      residualRisk: risk?.residualRisk ?? null,
      status: change.status,
    };
  });

  return {
    pack: {
      meeting,
      posture,
      agenda,
    },
    riskRegister,
    agendaChanges,
  };
}
