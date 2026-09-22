import type { ReportSchedule } from "../domain/ops/schedule.js";
import { getDb } from "../db/client.js";
import { randomUUID } from "node:crypto";

type ScheduleRow = {
  id: string;
  name: string;
  cadence: string;
  next_run: string;
  enabled: number;
};

function mapSchedule(row: ScheduleRow): ReportSchedule {
  return {
    id: row.id,
    name: row.name,
    cadence: row.cadence,
    nextRun: row.next_run,
    enabled: row.enabled === 1,
  };
}

export function listReportSchedules(): ReportSchedule[] {
  const rows = getDb()
    .prepare("SELECT * FROM report_schedules ORDER BY next_run ASC")
    .all() as ScheduleRow[];
  return rows.map(mapSchedule);
}

export function getReportScheduleById(id: string): ReportSchedule | null {
  const row = getDb().prepare("SELECT * FROM report_schedules WHERE id = ?").get(id) as
    | ScheduleRow
    | undefined;
  return row ? mapSchedule(row) : null;
}

export function createReportSchedule(input: {
  name: string;
  cadence: string;
  nextRun: string;
  enabled?: boolean;
}): ReportSchedule {
  const id = randomUUID();
  const enabled = input.enabled ?? true;
  getDb()
    .prepare(
      `INSERT INTO report_schedules (id, name, cadence, next_run, enabled)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, input.name, input.cadence, input.nextRun, enabled ? 1 : 0);
  return {
    id,
    name: input.name,
    cadence: input.cadence,
    nextRun: input.nextRun,
    enabled,
  };
}

export function updateReportSchedule(
  id: string,
  patch: Partial<Pick<ReportSchedule, "name" | "cadence" | "nextRun" | "enabled">>,
): ReportSchedule | null {
  const existing = getReportScheduleById(id);
  if (!existing) {
    return null;
  }
  const next = {
    name: patch.name ?? existing.name,
    cadence: patch.cadence ?? existing.cadence,
    nextRun: patch.nextRun ?? existing.nextRun,
    enabled: patch.enabled ?? existing.enabled,
  };
  getDb()
    .prepare(
      `UPDATE report_schedules
       SET name = ?, cadence = ?, next_run = ?, enabled = ?
       WHERE id = ?`,
    )
    .run(next.name, next.cadence, next.nextRun, next.enabled ? 1 : 0, id);
  return getReportScheduleById(id);
}

export function deleteReportSchedule(id: string): boolean {
  const result = getDb().prepare("DELETE FROM report_schedules WHERE id = ?").run(id);
  return result.changes > 0;
}
