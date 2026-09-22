import Database from "better-sqlite3";

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === column)) {
    return;
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

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
      resolved_at TEXT,
      theme TEXT,
      tags_json TEXT,
      category TEXT
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
      theme TEXT,
      tags_json TEXT,
      category TEXT,
      PRIMARY KEY (source, field)
    );

    CREATE TABLE IF NOT EXISTS ops_alerts (
      id TEXT PRIMARY KEY,
      application TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      theme TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      category TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      source_system TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ops_alerts_theme
      ON ops_alerts (theme);

    CREATE TABLE IF NOT EXISTS customer_notes (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      author TEXT,
      body TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customer_notes_customer
      ON customer_notes (customer_id);

    CREATE TABLE IF NOT EXISTS risk_analysis_reports (
      period_key TEXT PRIMARY KEY,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      generated_at TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session
      ON chat_messages (session_id, created_at);

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      month_label TEXT PRIMARY KEY,
      month_key TEXT NOT NULL,
      runs INTEGER NOT NULL,
      flags INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      share_percent REAL NOT NULL,
      enabled INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pii_flags (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      score INTEGER NOT NULL,
      factors_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_snapshots (
      id TEXT PRIMARY KEY,
      risk_id TEXT NOT NULL,
      period TEXT NOT NULL,
      summary TEXT NOT NULL,
      state TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_risk_snapshots_period
      ON risk_snapshots (period, state);

    CREATE TABLE IF NOT EXISTS enterprise_risks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      likelihood TEXT NOT NULL,
      impact TEXT NOT NULL,
      owner TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_enterprise_risks_category
      ON enterprise_risks (category);

    CREATE TABLE IF NOT EXISTS performance_series (
      period TEXT NOT NULL,
      month_label TEXT NOT NULL,
      value REAL NOT NULL,
      target REAL NOT NULL,
      is_anomaly INTEGER NOT NULL,
      PRIMARY KEY (period, month_label)
    );

    CREATE TABLE IF NOT EXISTS monthly_reports (
      period TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS report_schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cadence TEXT NOT NULL,
      next_run TEXT NOT NULL,
      enabled INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate older DBs created before theme/tags columns existed.
  ensureColumn(db, "incidents", "theme", "TEXT");
  ensureColumn(db, "incidents", "tags_json", "TEXT");
  ensureColumn(db, "incidents", "category", "TEXT");
  ensureColumn(db, "data_quality", "theme", "TEXT");
  ensureColumn(db, "data_quality", "tags_json", "TEXT");
  ensureColumn(db, "data_quality", "category", "TEXT");
}
