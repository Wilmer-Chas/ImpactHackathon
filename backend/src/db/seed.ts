import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { closeDb, getDb } from "./client.js";
import { chunkId, serializeEmbedding, type EntityType } from "./types.js";
import { contentHash, embedTexts } from "../services/ai/embeddings.client.js";
import type { ChangeRequest } from "../domain/change/changeRequest.js";
import type { Incident } from "../domain/incident/incident.js";
import type { DataQualityIssue } from "../domain/ops/dataQuality.js";
import type { PerformanceMetric, ProcessMetric } from "../domain/ops/metrics.js";
import type { ReleasePlan } from "../domain/ops/release.js";
import type { RiskRecord } from "../domain/risk/risk.js";
import { readFileSync, readdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function resolveMockDataDir(): string {
  if (process.env.MOCK_DATA_DIR?.trim()) {
    return path.resolve(process.env.MOCK_DATA_DIR.trim());
  }
  return path.resolve(__dirname, "../../../mock-data");
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

type PendingChunk = {
  entityType: EntityType;
  entityId: string;
  text: string;
};

type SeedStats = {
  entitiesUpserted: number;
  entitiesUnchanged: number;
  embeddingsCreated: number;
  embeddingsSkipped: number;
};

function processMetricEntityId(m: ProcessMetric): string {
  return `${m.application}|${m.processName}|${m.timestamp}`;
}

function performanceMetricEntityId(m: PerformanceMetric): string {
  return `${m.application}|${m.metricName}|${m.timestamp}`;
}

function dataQualityEntityId(issue: DataQualityIssue): string {
  return `${issue.source}|${issue.field}`;
}

function chunkTextForChange(c: ChangeRequest): string {
  return [
    `Change ${c.id}`,
    `title: ${c.title}`,
    `description: ${c.description}`,
    `application: ${c.application}`,
    `changeType: ${c.changeType}`,
    `owner: ${c.owner}`,
    `status: ${c.status}`,
    `plannedReleaseId: ${c.plannedReleaseId}`,
    `requestedAt: ${c.requestedAt}`,
  ].join("\n");
}

function chunkTextForIncident(i: Incident): string {
  return [
    `Incident ${i.id}`,
    `title: ${i.title}`,
    `application: ${i.application}`,
    `severity: ${i.severity}`,
    `status: ${i.status}`,
    `rootCause: ${i.rootCause ?? "unknown"}`,
    `openedAt: ${i.openedAt}`,
    `resolvedAt: ${i.resolvedAt ?? "open"}`,
  ].join("\n");
}

function chunkTextForProcessMetric(m: ProcessMetric): string {
  return [
    `Process metric`,
    `application: ${m.application}`,
    `processName: ${m.processName}`,
    `alertVolume: ${m.alertVolume}`,
    `backlogCount: ${m.backlogCount}`,
    `delayHours: ${m.delayHours}`,
    `timestamp: ${m.timestamp}`,
  ].join("\n");
}

function chunkTextForPerformanceMetric(m: PerformanceMetric): string {
  return [
    `Performance metric`,
    `application: ${m.application}`,
    `metricName: ${m.metricName}`,
    `value: ${m.value}`,
    `unit: ${m.unit}`,
    `slaTarget: ${m.slaTarget}`,
    `timestamp: ${m.timestamp}`,
  ].join("\n");
}

function chunkTextForRisk(r: RiskRecord): string {
  return [
    `Risk record`,
    `changeType: ${r.changeType}`,
    `category: ${r.category}`,
    `likelihood: ${r.likelihood}`,
    `impact: ${r.impact}`,
    `residualRisk: ${r.residualRisk}`,
    `notes: ${r.notes}`,
  ].join("\n");
}

function chunkTextForRelease(r: ReleasePlan): string {
  return [
    `Release ${r.id}`,
    `name: ${r.name}`,
    `windowStart: ${r.windowStart}`,
    `windowEnd: ${r.windowEnd}`,
    `freezeActive: ${r.freezeActive}`,
    `auditPeriodActive: ${r.auditPeriodActive}`,
    `changeIds: ${r.changeIds.join(", ")}`,
  ].join("\n");
}

function chunkTextForDataQuality(issue: DataQualityIssue): string {
  return [
    `Data quality issue`,
    `source: ${issue.source}`,
    `field: ${issue.field}`,
    `missingRate: ${issue.missingRate}`,
    `severity: ${issue.severity}`,
    `notes: ${issue.notes}`,
  ].join("\n");
}

function upsertChange(change: ChangeRequest, stats: SeedStats): void {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM changes WHERE id = ?").get(change.id) as
    | { id: string }
    | undefined;
  const result = db
    .prepare(
      `INSERT INTO changes (
         id, title, description, application, change_type, owner, status, planned_release_id, requested_at
       ) VALUES (
         @id, @title, @description, @application, @changeType, @owner, @status, @plannedReleaseId, @requestedAt
       )
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         application = excluded.application,
         change_type = excluded.change_type,
         owner = excluded.owner,
         status = excluded.status,
         planned_release_id = excluded.planned_release_id,
         requested_at = excluded.requested_at
       WHERE changes.title IS NOT excluded.title
          OR changes.description IS NOT excluded.description
          OR changes.application IS NOT excluded.application
          OR changes.change_type IS NOT excluded.change_type
          OR changes.owner IS NOT excluded.owner
          OR changes.status IS NOT excluded.status
          OR changes.planned_release_id IS NOT excluded.planned_release_id
          OR changes.requested_at IS NOT excluded.requested_at`,
    )
    .run({
      id: change.id,
      title: change.title,
      description: change.description,
      application: change.application,
      changeType: change.changeType,
      owner: change.owner,
      status: change.status,
      plannedReleaseId: change.plannedReleaseId,
      requestedAt: change.requestedAt,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertIncident(incident: Incident, stats: SeedStats): void {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM incidents WHERE id = ?").get(incident.id) as
    | { id: string }
    | undefined;
  const result = db
    .prepare(
      `INSERT INTO incidents (
         id, application, title, severity, status, root_cause, opened_at, resolved_at
       ) VALUES (
         @id, @application, @title, @severity, @status, @rootCause, @openedAt, @resolvedAt
       )
       ON CONFLICT(id) DO UPDATE SET
         application = excluded.application,
         title = excluded.title,
         severity = excluded.severity,
         status = excluded.status,
         root_cause = excluded.root_cause,
         opened_at = excluded.opened_at,
         resolved_at = excluded.resolved_at
       WHERE incidents.application IS NOT excluded.application
          OR incidents.title IS NOT excluded.title
          OR incidents.severity IS NOT excluded.severity
          OR incidents.status IS NOT excluded.status
          OR incidents.root_cause IS NOT excluded.root_cause
          OR incidents.opened_at IS NOT excluded.opened_at
          OR incidents.resolved_at IS NOT excluded.resolved_at`,
    )
    .run({
      id: incident.id,
      application: incident.application,
      title: incident.title,
      severity: incident.severity,
      status: incident.status,
      rootCause: incident.rootCause,
      openedAt: incident.openedAt,
      resolvedAt: incident.resolvedAt,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertProcessMetric(metric: ProcessMetric, stats: SeedStats): void {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT 1 AS ok FROM process_metrics
       WHERE application = ? AND process_name = ? AND timestamp = ?`,
    )
    .get(metric.application, metric.processName, metric.timestamp) as { ok: number } | undefined;
  const result = db
    .prepare(
      `INSERT INTO process_metrics (
         application, process_name, alert_volume, backlog_count, delay_hours, timestamp
       ) VALUES (
         @application, @processName, @alertVolume, @backlogCount, @delayHours, @timestamp
       )
       ON CONFLICT(application, process_name, timestamp) DO UPDATE SET
         alert_volume = excluded.alert_volume,
         backlog_count = excluded.backlog_count,
         delay_hours = excluded.delay_hours
       WHERE process_metrics.alert_volume IS NOT excluded.alert_volume
          OR process_metrics.backlog_count IS NOT excluded.backlog_count
          OR process_metrics.delay_hours IS NOT excluded.delay_hours`,
    )
    .run({
      application: metric.application,
      processName: metric.processName,
      alertVolume: metric.alertVolume,
      backlogCount: metric.backlogCount,
      delayHours: metric.delayHours,
      timestamp: metric.timestamp,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertPerformanceMetric(metric: PerformanceMetric, stats: SeedStats): void {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT 1 AS ok FROM performance_metrics
       WHERE application = ? AND metric_name = ? AND timestamp = ?`,
    )
    .get(metric.application, metric.metricName, metric.timestamp) as { ok: number } | undefined;
  const result = db
    .prepare(
      `INSERT INTO performance_metrics (
         application, metric_name, value, unit, sla_target, timestamp
       ) VALUES (
         @application, @metricName, @value, @unit, @slaTarget, @timestamp
       )
       ON CONFLICT(application, metric_name, timestamp) DO UPDATE SET
         value = excluded.value,
         unit = excluded.unit,
         sla_target = excluded.sla_target
       WHERE performance_metrics.value IS NOT excluded.value
          OR performance_metrics.unit IS NOT excluded.unit
          OR performance_metrics.sla_target IS NOT excluded.sla_target`,
    )
    .run({
      application: metric.application,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      slaTarget: metric.slaTarget,
      timestamp: metric.timestamp,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertRisk(risk: RiskRecord, stats: SeedStats): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT change_type FROM risk_register WHERE change_type = ?")
    .get(risk.changeType) as { change_type: string } | undefined;
  const result = db
    .prepare(
      `INSERT INTO risk_register (
         change_type, category, likelihood, impact, residual_risk, notes
       ) VALUES (
         @changeType, @category, @likelihood, @impact, @residualRisk, @notes
       )
       ON CONFLICT(change_type) DO UPDATE SET
         category = excluded.category,
         likelihood = excluded.likelihood,
         impact = excluded.impact,
         residual_risk = excluded.residual_risk,
         notes = excluded.notes
       WHERE risk_register.category IS NOT excluded.category
          OR risk_register.likelihood IS NOT excluded.likelihood
          OR risk_register.impact IS NOT excluded.impact
          OR risk_register.residual_risk IS NOT excluded.residual_risk
          OR risk_register.notes IS NOT excluded.notes`,
    )
    .run({
      changeType: risk.changeType,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      residualRisk: risk.residualRisk,
      notes: risk.notes,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertRelease(release: ReleasePlan, stats: SeedStats): void {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM release_plans WHERE id = ?").get(release.id) as
    | { id: string }
    | undefined;

  const result = db
    .prepare(
      `INSERT INTO release_plans (
         id, name, window_start, window_end, freeze_active, audit_period_active
       ) VALUES (
         @id, @name, @windowStart, @windowEnd, @freezeActive, @auditPeriodActive
       )
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         window_start = excluded.window_start,
         window_end = excluded.window_end,
         freeze_active = excluded.freeze_active,
         audit_period_active = excluded.audit_period_active
       WHERE release_plans.name IS NOT excluded.name
          OR release_plans.window_start IS NOT excluded.window_start
          OR release_plans.window_end IS NOT excluded.window_end
          OR release_plans.freeze_active IS NOT excluded.freeze_active
          OR release_plans.audit_period_active IS NOT excluded.audit_period_active`,
    )
    .run({
      id: release.id,
      name: release.name,
      windowStart: release.windowStart,
      windowEnd: release.windowEnd,
      freezeActive: release.freezeActive ? 1 : 0,
      auditPeriodActive: release.auditPeriodActive ? 1 : 0,
    });

  // Sync change links without duplicating: replace set for this release
  const existingLinks = (
    db
      .prepare("SELECT change_id FROM release_change_ids WHERE release_id = ?")
      .all(release.id) as Array<{ change_id: string }>
  ).map((r) => r.change_id);
  const desired = new Set(release.changeIds);
  const existingSet = new Set(existingLinks);

  const insertLink = db.prepare(
    `INSERT OR IGNORE INTO release_change_ids (release_id, change_id) VALUES (?, ?)`,
  );
  const deleteLink = db.prepare(
    `DELETE FROM release_change_ids WHERE release_id = ? AND change_id = ?`,
  );

  let linksChanged = false;
  for (const changeId of release.changeIds) {
    if (!existingSet.has(changeId)) {
      insertLink.run(release.id, changeId);
      linksChanged = true;
    }
  }
  for (const changeId of existingLinks) {
    if (!desired.has(changeId)) {
      deleteLink.run(release.id, changeId);
      linksChanged = true;
    }
  }

  if (!existing || result.changes > 0 || linksChanged) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

function upsertDataQuality(issue: DataQualityIssue, stats: SeedStats): void {
  const db = getDb();
  const existing = db
    .prepare("SELECT 1 AS ok FROM data_quality WHERE source = ? AND field = ?")
    .get(issue.source, issue.field) as { ok: number } | undefined;
  const result = db
    .prepare(
      `INSERT INTO data_quality (source, field, missing_rate, severity, notes)
       VALUES (@source, @field, @missingRate, @severity, @notes)
       ON CONFLICT(source, field) DO UPDATE SET
         missing_rate = excluded.missing_rate,
         severity = excluded.severity,
         notes = excluded.notes
       WHERE data_quality.missing_rate IS NOT excluded.missing_rate
          OR data_quality.severity IS NOT excluded.severity
          OR data_quality.notes IS NOT excluded.notes`,
    )
    .run({
      source: issue.source,
      field: issue.field,
      missingRate: issue.missingRate,
      severity: issue.severity,
      notes: issue.notes,
    });

  if (!existing) {
    stats.entitiesUpserted += 1;
  } else if (result.changes > 0) {
    stats.entitiesUpserted += 1;
  } else {
    stats.entitiesUnchanged += 1;
  }
}

async function upsertChunks(pending: PendingChunk[], stats: SeedStats): Promise<void> {
  const db = getDb();
  const select = db.prepare(
    `SELECT content_hash, embedding FROM evidence_chunks WHERE id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO evidence_chunks (id, entity_type, entity_id, text, content_hash, embedding, updated_at)
     VALUES (@id, @entityType, @entityId, @text, @contentHash, @embedding, @updatedAt)`,
  );
  const update = db.prepare(
    `UPDATE evidence_chunks
     SET text = @text,
         content_hash = @contentHash,
         embedding = @embedding,
         updated_at = @updatedAt
     WHERE id = @id`,
  );

  const toEmbed: Array<{ chunk: PendingChunk; hash: string; id: string }> = [];

  for (const chunk of pending) {
    const id = chunkId(chunk.entityType, chunk.entityId);
    const hash = contentHash(chunk.text);
    const existing = select.get(id) as { content_hash: string; embedding: string | null } | undefined;

    if (existing && existing.content_hash === hash && existing.embedding) {
      stats.embeddingsSkipped += 1;
      continue;
    }

    toEmbed.push({ chunk, hash, id });
  }

  if (toEmbed.length === 0) {
    return;
  }

  const embeddings = await embedTexts(toEmbed.map((item) => item.chunk.text));
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (let i = 0; i < toEmbed.length; i += 1) {
      const item = toEmbed[i]!;
      const embedding = serializeEmbedding(embeddings[i]!);
      const existing = select.get(item.id) as { content_hash: string } | undefined;
      const payload = {
        id: item.id,
        entityType: item.chunk.entityType,
        entityId: item.chunk.entityId,
        text: item.chunk.text,
        contentHash: item.hash,
        embedding,
        updatedAt: now,
      };
      if (existing) {
        update.run(payload);
      } else {
        insert.run(payload);
      }
      stats.embeddingsCreated += 1;
    }
  });
  tx();
}

export async function seedMockData(): Promise<SeedStats> {
  const mockDir = resolveMockDataDir();
  const stats: SeedStats = {
    entitiesUpserted: 0,
    entitiesUnchanged: 0,
    embeddingsCreated: 0,
    embeddingsSkipped: 0,
  };

  getDb(); // ensure schema

  const changeFiles = readdirSync(path.join(mockDir, "changes"))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const changes = changeFiles.map((name) =>
    loadJson<ChangeRequest>(path.join(mockDir, "changes", name)),
  );
  const incidents = loadJson<Incident[]>(path.join(mockDir, "incidents", "incidents.json"));
  const processMetrics = loadJson<ProcessMetric[]>(
    path.join(mockDir, "ops", "process-metrics.json"),
  );
  const performanceMetrics = loadJson<PerformanceMetric[]>(
    path.join(mockDir, "ops", "performance-metrics.json"),
  );
  const riskRegister = loadJson<RiskRecord[]>(path.join(mockDir, "risk", "risk-register.json"));
  const release = loadJson<ReleasePlan>(path.join(mockDir, "ops", "release-plan.json"));
  const dataQuality = loadJson<DataQualityIssue[]>(
    path.join(mockDir, "quality", "data-quality.json"),
  );

  const pendingChunks: PendingChunk[] = [];

  for (const change of changes) {
    upsertChange(change, stats);
    pendingChunks.push({
      entityType: "change",
      entityId: change.id,
      text: chunkTextForChange(change),
    });
  }

  for (const incident of incidents) {
    upsertIncident(incident, stats);
    pendingChunks.push({
      entityType: "incident",
      entityId: incident.id,
      text: chunkTextForIncident(incident),
    });
  }

  for (const metric of processMetrics) {
    upsertProcessMetric(metric, stats);
    pendingChunks.push({
      entityType: "process_metric",
      entityId: processMetricEntityId(metric),
      text: chunkTextForProcessMetric(metric),
    });
  }

  for (const metric of performanceMetrics) {
    upsertPerformanceMetric(metric, stats);
    pendingChunks.push({
      entityType: "performance_metric",
      entityId: performanceMetricEntityId(metric),
      text: chunkTextForPerformanceMetric(metric),
    });
  }

  for (const risk of riskRegister) {
    upsertRisk(risk, stats);
    pendingChunks.push({
      entityType: "risk",
      entityId: risk.changeType,
      text: chunkTextForRisk(risk),
    });
  }

  upsertRelease(release, stats);
  pendingChunks.push({
    entityType: "release",
    entityId: release.id,
    text: chunkTextForRelease(release),
  });

  for (const issue of dataQuality) {
    upsertDataQuality(issue, stats);
    pendingChunks.push({
      entityType: "data_quality",
      entityId: dataQualityEntityId(issue),
      text: chunkTextForDataQuality(issue),
    });
  }

  await upsertChunks(pendingChunks, stats);
  return stats;
}

async function main(): Promise<void> {
  try {
    const stats = await seedMockData();
    console.log("Seed complete:", stats);
  } finally {
    closeDb();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
