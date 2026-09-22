import type { PerformanceMetric, ProcessMetric } from "../domain/index.js";
import { getDb } from "../db/client.js";

type ProcessMetricRow = {
  application: string;
  process_name: string;
  alert_volume: number;
  backlog_count: number;
  delay_hours: number;
  timestamp: string;
};

type PerformanceMetricRow = {
  application: string;
  metric_name: string;
  value: number;
  unit: string;
  sla_target: number;
  timestamp: string;
};

function mapProcessMetric(row: ProcessMetricRow): ProcessMetric {
  return {
    application: row.application,
    processName: row.process_name,
    alertVolume: row.alert_volume,
    backlogCount: row.backlog_count,
    delayHours: row.delay_hours,
    timestamp: row.timestamp,
  };
}

function mapPerformanceMetric(row: PerformanceMetricRow): PerformanceMetric {
  return {
    application: row.application,
    metricName: row.metric_name,
    value: row.value,
    unit: row.unit,
    slaTarget: row.sla_target,
    timestamp: row.timestamp,
  };
}

export function listAllProcessMetrics(): ProcessMetric[] {
  const rows = getDb().prepare("SELECT * FROM process_metrics").all() as ProcessMetricRow[];
  return rows.map(mapProcessMetric);
}

export function listProcessMetricsByApplication(application: string): ProcessMetric[] {
  const rows = getDb()
    .prepare("SELECT * FROM process_metrics WHERE application = ?")
    .all(application) as ProcessMetricRow[];
  return rows.map(mapProcessMetric);
}

export function getProcessMetricByEntityId(entityId: string): ProcessMetric | null {
  const [application, processName, timestamp] = entityId.split("|");
  if (!application || !processName || !timestamp) {
    return null;
  }
  const row = getDb()
    .prepare(
      `SELECT * FROM process_metrics
       WHERE application = ? AND process_name = ? AND timestamp = ?`,
    )
    .get(application, processName, timestamp) as ProcessMetricRow | undefined;
  return row ? mapProcessMetric(row) : null;
}

export function listAllPerformanceMetrics(): PerformanceMetric[] {
  const rows = getDb().prepare("SELECT * FROM performance_metrics").all() as PerformanceMetricRow[];
  return rows.map(mapPerformanceMetric);
}

export function listPerformanceMetricsByApplication(application: string): PerformanceMetric[] {
  const rows = getDb()
    .prepare("SELECT * FROM performance_metrics WHERE application = ?")
    .all(application) as PerformanceMetricRow[];
  return rows.map(mapPerformanceMetric);
}

export function getPerformanceMetricByEntityId(entityId: string): PerformanceMetric | null {
  const [application, metricName, timestamp] = entityId.split("|");
  if (!application || !metricName || !timestamp) {
    return null;
  }
  const row = getDb()
    .prepare(
      `SELECT * FROM performance_metrics
       WHERE application = ? AND metric_name = ? AND timestamp = ?`,
    )
    .get(application, metricName, timestamp) as PerformanceMetricRow | undefined;
  return row ? mapPerformanceMetric(row) : null;
}
