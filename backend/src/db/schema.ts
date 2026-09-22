import Database from "better-sqlite3";

export function applySchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      application TEXT NOT NULL,
      change_type TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      planned_release_id TEXT NOT NULL,
      requested_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      application TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      root_cause TEXT,
      opened_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS process_metrics (
      application TEXT NOT NULL,
      process_name TEXT NOT NULL,
      alert_volume REAL NOT NULL,
      backlog_count REAL NOT NULL,
      delay_hours REAL NOT NULL,
      timestamp TEXT NOT NULL,
      PRIMARY KEY (application, process_name, timestamp)
    );

    CREATE TABLE IF NOT EXISTS performance_metrics (
      application TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      sla_target REAL NOT NULL,
      timestamp TEXT NOT NULL,
      PRIMARY KEY (application, metric_name, timestamp)
    );

    CREATE TABLE IF NOT EXISTS risk_register (
      change_type TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      likelihood REAL NOT NULL,
      impact REAL NOT NULL,
      residual_risk TEXT NOT NULL,
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS release_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      freeze_active INTEGER NOT NULL,
      audit_period_active INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS release_change_ids (
      release_id TEXT NOT NULL,
      change_id TEXT NOT NULL,
      PRIMARY KEY (release_id, change_id),
      FOREIGN KEY (release_id) REFERENCES release_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS data_quality (
      source TEXT NOT NULL,
      field TEXT NOT NULL,
      missing_rate REAL NOT NULL,
      severity TEXT NOT NULL,
      notes TEXT NOT NULL,
      PRIMARY KEY (source, field)
    );

    CREATE TABLE IF NOT EXISTS evidence_chunks (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      text TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      embedding TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_chunks_entity
      ON evidence_chunks (entity_type, entity_id);
  `);
}
