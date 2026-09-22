import type { OpsAlert } from "../domain/index.js";
import { getDb } from "../db/client.js";

type OpsAlertRow = {
  id: string;
  application: string;
  title: string;
  severity: string;
  status: string;
  theme: string;
  tags_json: string;
  category: string;
  opened_at: string;
  source_system: string;
};

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function mapOpsAlert(row: OpsAlertRow): OpsAlert {
  return {
    id: row.id,
    application: row.application,
    title: row.title,
    severity: row.severity as OpsAlert["severity"],
    status: row.status as OpsAlert["status"],
    theme: row.theme,
    tags: parseTags(row.tags_json),
    category: row.category,
    openedAt: row.opened_at,
    sourceSystem: row.source_system,
  };
}

export function getOpsAlertById(id: string): OpsAlert | null {
  const row = getDb().prepare("SELECT * FROM ops_alerts WHERE id = ?").get(id) as
    | OpsAlertRow
    | undefined;
  return row ? mapOpsAlert(row) : null;
}

export function listAllOpsAlerts(): OpsAlert[] {
  const rows = getDb().prepare("SELECT * FROM ops_alerts").all() as OpsAlertRow[];
  return rows.map(mapOpsAlert);
}
