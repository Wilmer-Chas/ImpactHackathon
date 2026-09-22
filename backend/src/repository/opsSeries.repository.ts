import type { PerformanceSeriesPoint, RiskSnapshot } from "../domain/ops/trends.js";
import { getDb } from "../db/client.js";

type SeriesRow = {
  period: string;
  month_label: string;
  value: number;
  target: number;
  is_anomaly: number;
};

type SnapshotRow = {
  id: string;
  risk_id: string;
  period: string;
  summary: string;
  state: string;
};

function mapSeries(row: SeriesRow): PerformanceSeriesPoint {
  return {
    period: row.period,
    monthLabel: row.month_label,
    value: row.value,
    target: row.target,
    isAnomaly: row.is_anomaly === 1,
  };
}

function mapSnapshot(row: SnapshotRow): RiskSnapshot {
  return {
    id: row.id,
    riskId: row.risk_id,
    period: row.period,
    summary: row.summary,
    state: row.state as RiskSnapshot["state"],
  };
}

export function listPerformanceSeriesByPeriod(period: string): PerformanceSeriesPoint[] {
  const rows = getDb()
    .prepare("SELECT * FROM performance_series WHERE period = ?")
    .all(period) as SeriesRow[];
  return rows.map(mapSeries);
}

export function listAnomalyPerformancePoints(): PerformanceSeriesPoint[] {
  const rows = getDb()
    .prepare("SELECT * FROM performance_series WHERE is_anomaly = 1")
    .all() as SeriesRow[];
  return rows.map(mapSeries);
}

export function listRiskSnapshotsByPeriod(period: string): RiskSnapshot[] {
  const rows = getDb()
    .prepare("SELECT * FROM risk_snapshots WHERE period = ?")
    .all(period) as SnapshotRow[];
  return rows.map(mapSnapshot);
}

export function listDistinctPerformancePeriods(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT period FROM performance_series ORDER BY period DESC")
    .all() as Array<{ period: string }>;
  return rows.map((r) => r.period);
}
