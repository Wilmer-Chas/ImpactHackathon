import type { AdminKpis, AiModel, PipelineRun, PiiFlag, PiiFlagAction } from "../domain/admin/admin.js";
import { getDb } from "../db/client.js";

type PipelineRow = {
  month_label: string;
  month_key: string;
  runs: number;
  flags: number;
};

type ModelRow = {
  id: string;
  name: string;
  share_percent: number;
  enabled: number;
  sort_order: number;
};

type FlagRow = {
  id: string;
  description: string;
  score: number;
  factors_json: string;
  status: string;
  created_at: string;
};

function mapPipeline(row: PipelineRow): PipelineRun {
  return {
    monthLabel: row.month_label,
    monthKey: row.month_key,
    runs: row.runs,
    flags: row.flags,
  };
}

function mapModel(row: ModelRow): AiModel {
  return {
    id: row.id,
    name: row.name,
    sharePercent: row.share_percent,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order,
  };
}

function mapFlag(row: FlagRow): PiiFlag {
  return {
    id: row.id,
    description: row.description,
    score: row.score,
    factors: JSON.parse(row.factors_json) as string[],
    status: row.status as PiiFlag["status"],
    createdAt: row.created_at,
  };
}

export function listPipelineRuns(): PipelineRun[] {
  const rows = getDb()
    .prepare("SELECT * FROM pipeline_runs ORDER BY month_key ASC")
    .all() as PipelineRow[];
  return rows.map(mapPipeline);
}

export function listAiModels(): AiModel[] {
  const rows = getDb()
    .prepare("SELECT * FROM ai_models ORDER BY sort_order ASC")
    .all() as ModelRow[];
  return rows.map(mapModel);
}

export function listPendingPiiFlags(): PiiFlag[] {
  const rows = getDb()
    .prepare("SELECT * FROM pii_flags WHERE status = 'pending' ORDER BY score DESC")
    .all() as FlagRow[];
  return rows.map(mapFlag);
}

export function getPiiFlagById(id: string): PiiFlag | null {
  const row = getDb().prepare("SELECT * FROM pii_flags WHERE id = ?").get(id) as FlagRow | undefined;
  return row ? mapFlag(row) : null;
}

export function applyPiiFlagAction(id: string, action: PiiFlagAction): PiiFlag | null {
  const statusMap: Record<PiiFlagAction, PiiFlag["status"]> = {
    approve: "approved",
    redact: "redacted",
    reject: "rejected",
  };
  const status = statusMap[action];
  const result = getDb()
    .prepare(`UPDATE pii_flags SET status = ? WHERE id = ? AND status = 'pending'`)
    .run(status, id);
  if (result.changes === 0) {
    return getPiiFlagById(id);
  }
  return getPiiFlagById(id);
}

function metaNumber(key: string, fallback: number): number {
  const row = getDb().prepare("SELECT value FROM admin_meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) {
    return fallback;
  }
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

export function getAdminKpis(): AdminKpis {
  const runsSeries = listPipelineRuns();
  const latest = runsSeries[runsSeries.length - 1];
  const models = listAiModels();
  const flagged = listPendingPiiFlags();
  return {
    runs: latest?.runs ?? 0,
    scanned: metaNumber("scanned", 0),
    flagged: flagged.length,
    activeUsers: metaNumber("activeUsers", 0),
    approvedModels: models.filter((m) => m.enabled).length,
  };
}
