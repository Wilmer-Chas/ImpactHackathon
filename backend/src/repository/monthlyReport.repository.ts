import type { MonthlyReport } from "../domain/ops/monthlyReport.js";
import { getDb } from "../db/client.js";

type ReportRow = {
  period: string;
  title: string;
  subtitle: string;
  payload_json: string;
  generated_at: string;
};

export function getMonthlyReport(period: string): MonthlyReport | null {
  const row = getDb().prepare("SELECT * FROM monthly_reports WHERE period = ?").get(period) as
    | ReportRow
    | undefined;
  if (!row) {
    return null;
  }
  return JSON.parse(row.payload_json) as MonthlyReport;
}

export function listMonthlyReportPeriods(): string[] {
  const rows = getDb()
    .prepare("SELECT period FROM monthly_reports ORDER BY period DESC")
    .all() as Array<{ period: string }>;
  return rows.map((r) => r.period);
}

export function upsertMonthlyReport(report: MonthlyReport): void {
  getDb()
    .prepare(
      `INSERT INTO monthly_reports (period, title, subtitle, payload_json, generated_at)
       VALUES (@period, @title, @subtitle, @payloadJson, @generatedAt)
       ON CONFLICT(period) DO UPDATE SET
         title = excluded.title,
         subtitle = excluded.subtitle,
         payload_json = excluded.payload_json,
         generated_at = excluded.generated_at`,
    )
    .run({
      period: report.period,
      title: report.title,
      subtitle: report.subtitle,
      payloadJson: JSON.stringify(report),
      generatedAt: report.generatedAt,
    });
}

export function getLatestMonthlyReport(): MonthlyReport | null {
  const periods = listMonthlyReportPeriods();
  if (periods.length === 0) {
    return null;
  }
  return getMonthlyReport(periods[0]!);
}
