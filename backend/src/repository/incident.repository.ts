import type { Incident } from "../domain/index.js";
import { getDb } from "../db/client.js";

type IncidentRow = {
  id: string;
  application: string;
  title: string;
  severity: string;
  status: string;
  root_cause: string | null;
  opened_at: string;
  resolved_at: string | null;
  theme: string | null;
  tags_json: string | null;
  category: string | null;
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    application: row.application,
    title: row.title,
    severity: row.severity as Incident["severity"],
    status: row.status as Incident["status"],
    rootCause: row.root_cause,
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
    theme: row.theme,
    tags: parseTags(row.tags_json),
    category: row.category,
  };
}

export function getIncidentById(id: string): Incident | null {
  const row = getDb().prepare("SELECT * FROM incidents WHERE id = ?").get(id) as
    | IncidentRow
    | undefined;
  return row ? mapIncident(row) : null;
}

export function listAllIncidents(): Incident[] {
  const rows = getDb().prepare("SELECT * FROM incidents").all() as IncidentRow[];
  return rows.map(mapIncident);
}

export function listIncidentsByApplication(application: string): Incident[] {
  const rows = getDb()
    .prepare("SELECT * FROM incidents WHERE application = ?")
    .all(application) as IncidentRow[];
  return rows.map(mapIncident);
}
