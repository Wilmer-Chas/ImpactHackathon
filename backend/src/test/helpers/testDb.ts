import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import { closeDb, getDb } from "../../db/client.js";
import { serializeEmbedding } from "../../db/types.js";

afterEach(() => {
  closeDb();
});

/** Fresh SQLite file for each test; closes any prior singleton. */
export function openTempDb() {
  const dir = mkdtempSync(path.join(tmpdir(), "impact-test-"));
  process.env.DATABASE_PATH = path.join(dir, "test.db");
  closeDb();
  return getDb();
}

export function seedMinimalEvidence() {
  const db = getDb();

  db.prepare(
    `INSERT INTO changes (
       id, title, description, application, change_type, owner, status, planned_release_id, requested_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "1001",
    "Lower alert thresholds for cross-border wires",
    "Make the cross-border wire monitoring rule more sensitive.",
    "TM-Core",
    "rule_threshold",
    "Alex Rivera",
    "pending_approval",
    "REL-2026-09",
    "2026-09-01",
  );

  db.prepare(
    `INSERT INTO incidents (
       id, application, title, severity, status, root_cause, opened_at, resolved_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "INC-4402",
    "TM-Core",
    "Batch scoring job stalled overnight",
    "high",
    "open",
    "Downstream queue backpressure",
    "2026-09-08",
    null,
  );

  db.prepare(
    `INSERT INTO process_metrics (
       application, process_name, alert_volume, backlog_count, delay_hours, timestamp
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("TM-Core", "Alert investigation queue", 4200, 980, 36, "2026-09-10");

  db.prepare(
    `INSERT INTO performance_metrics (
       application, metric_name, value, unit, sla_target, timestamp
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("TM-Core", "scoring_latency_p95_minutes", 48, "minutes", 30, "2026-09-10");

  db.prepare(
    `INSERT INTO risk_register (
       change_type, category, likelihood, impact, residual_risk, notes
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "rule_threshold",
    "Detection sensitivity",
    3,
    4,
    "high",
    "Lowering thresholds often creates more alerts.",
  );

  db.prepare(
    `INSERT INTO release_plans (
       id, name, window_start, window_end, freeze_active, audit_period_active
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("REL-2026-09", "September TM release", "2026-09-18", "2026-09-20", 0, 1);

  db.prepare(
    `INSERT INTO release_change_ids (release_id, change_id) VALUES (?, ?)`,
  ).run("REL-2026-09", "1001");

  db.prepare(
    `INSERT INTO data_quality (source, field, missing_rate, severity, notes)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("incidents", "rootCause", 0.33, "medium", "One related incident lacks root cause.");

  const now = new Date().toISOString();
  const insertChunk = db.prepare(
    `INSERT INTO evidence_chunks (
       id, entity_type, entity_id, text, content_hash, embedding, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  // Distinct directions so RAG ranking is deterministic under a mocked query vector [1,0,0].
  insertChunk.run(
    "incident:INC-4402",
    "incident",
    "INC-4402",
    "Incident INC-4402 Batch scoring stalled TM-Core",
    "hash-inc",
    serializeEmbedding([1, 0, 0]),
    now,
  );
  insertChunk.run(
    "risk:rule_threshold",
    "risk",
    "rule_threshold",
    "Risk rule_threshold high residual",
    "hash-risk",
    serializeEmbedding([0.9, 0.1, 0]),
    now,
  );
  insertChunk.run(
    "release:REL-2026-09",
    "release",
    "REL-2026-09",
    "Release REL-2026-09 audit period",
    "hash-rel",
    serializeEmbedding([0.8, 0.2, 0]),
    now,
  );
  insertChunk.run(
    "process_metric:TM-Core|Alert investigation queue|2026-09-10",
    "process_metric",
    "TM-Core|Alert investigation queue|2026-09-10",
    "Process backlog Alert investigation queue",
    "hash-proc",
    serializeEmbedding([0.7, 0.3, 0]),
    now,
  );
  insertChunk.run(
    "performance_metric:TM-Core|scoring_latency_p95_minutes|2026-09-10",
    "performance_metric",
    "TM-Core|scoring_latency_p95_minutes|2026-09-10",
    "Performance latency above SLA",
    "hash-perf",
    serializeEmbedding([0.6, 0.4, 0]),
    now,
  );
  insertChunk.run(
    "data_quality:incidents|rootCause",
    "data_quality",
    "incidents|rootCause",
    "Data quality rootCause missing",
    "hash-dq",
    serializeEmbedding([0.5, 0.5, 0]),
    now,
  );
}
