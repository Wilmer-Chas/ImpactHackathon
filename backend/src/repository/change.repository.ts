import type { ChangeRequest, ChangeType } from "../domain/index.js";
import { getDb } from "../db/client.js";

type ChangeRow = {
  id: string;
  title: string;
  description: string;
  application: string;
  change_type: string;
  owner: string;
  status: string;
  planned_release_id: string;
  requested_at: string;
};

function mapChange(row: ChangeRow): ChangeRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    application: row.application,
    changeType: row.change_type as ChangeType,
    owner: row.owner,
    status: row.status,
    plannedReleaseId: row.planned_release_id,
    requestedAt: row.requested_at,
  };
}

export function getChangeById(changeId: string): ChangeRequest | null {
  const row = getDb()
    .prepare("SELECT * FROM changes WHERE id = ?")
    .get(changeId) as ChangeRow | undefined;
  return row ? mapChange(row) : null;
}

export function listAllChanges(): ChangeRequest[] {
  const rows = getDb()
    .prepare("SELECT * FROM changes ORDER BY requested_at ASC")
    .all() as ChangeRow[];
  return rows.map(mapChange);
}

export function listChangesByIds(changeIds: string[]): ChangeRequest[] {
  if (changeIds.length === 0) {
    return [];
  }
  const placeholders = changeIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`SELECT * FROM changes WHERE id IN (${placeholders})`)
    .all(...changeIds) as ChangeRow[];
  const byId = new Map(rows.map((row) => [row.id, mapChange(row)]));
  return changeIds.map((id) => byId.get(id)).filter((c): c is ChangeRequest => Boolean(c));
}
