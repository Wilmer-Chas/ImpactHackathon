import type { RiskAnalysisReport } from "../domain/ops/riskAnalysis.js";
import { getDb } from "../db/client.js";

type ReportRow = {
  period_key: string;
  from_date: string;
  to_date: string;
  title: string;
  subtitle: string;
  payload_json: string;
  generated_at: string;
};

export function periodKey(from: string, to: string): string {
  return `${from}_${to}`;
}

export function getRiskAnalysisReport(from: string, to: string): RiskAnalysisReport | null {
  const row = getDb()
    .prepare("SELECT * FROM risk_analysis_reports WHERE period_key = ?")
    .get(periodKey(from, to)) as ReportRow | undefined;
  if (!row) return null;
  return JSON.parse(row.payload_json) as RiskAnalysisReport;
}

export function upsertRiskAnalysisReport(report: RiskAnalysisReport): void {
  getDb()
    .prepare(
      `INSERT INTO risk_analysis_reports (
         period_key, from_date, to_date, title, subtitle, payload_json, generated_at
       ) VALUES (
         @periodKey, @fromDate, @toDate, @title, @subtitle, @payloadJson, @generatedAt
       )
       ON CONFLICT(period_key) DO UPDATE SET
         from_date = excluded.from_date,
         to_date = excluded.to_date,
         title = excluded.title,
         subtitle = excluded.subtitle,
         payload_json = excluded.payload_json,
         generated_at = excluded.generated_at`,
    )
    .run({
      periodKey: periodKey(report.period.from, report.period.to),
      fromDate: report.period.from,
      toDate: report.period.to,
      title: report.title,
      subtitle: report.subtitle,
      payloadJson: JSON.stringify(report),
      generatedAt: report.generatedAt,
    });
}
