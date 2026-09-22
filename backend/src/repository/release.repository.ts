import type { ReleasePlan } from "../domain/index.js";
import { getDb } from "../db/client.js";

type ReleaseRow = {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  freeze_active: number;
  audit_period_active: number;
};

function mapRelease(row: ReleaseRow, changeIds: string[]): ReleasePlan {
  return {
    id: row.id,
    name: row.name,
    windowStart: row.window_start,
    windowEnd: row.window_end,
    freezeActive: row.freeze_active === 1,
    auditPeriodActive: row.audit_period_active === 1,
    changeIds,
  };
}

export function getReleaseById(releaseId: string): ReleasePlan | null {
  const row = getDb()
    .prepare("SELECT * FROM release_plans WHERE id = ?")
    .get(releaseId) as ReleaseRow | undefined;
  if (!row) {
    return null;
  }
  const changeIds = (
    getDb()
      .prepare("SELECT change_id FROM release_change_ids WHERE release_id = ?")
      .all(releaseId) as Array<{ change_id: string }>
  ).map((r) => r.change_id);
  return mapRelease(row, changeIds);
}

export function getPrimaryRelease(): ReleasePlan | null {
  const row = getDb()
    .prepare("SELECT * FROM release_plans ORDER BY id LIMIT 1")
    .get() as ReleaseRow | undefined;
  if (!row) {
    return null;
  }
  return getReleaseById(row.id);
}

export function getReleaseForChange(changeId: string): ReleasePlan | null {
  const link = getDb()
    .prepare("SELECT release_id FROM release_change_ids WHERE change_id = ? LIMIT 1")
    .get(changeId) as { release_id: string } | undefined;
  if (!link) {
    return null;
  }
  return getReleaseById(link.release_id);
}
