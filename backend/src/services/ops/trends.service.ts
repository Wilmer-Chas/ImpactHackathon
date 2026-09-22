import type { TrendsResponse, TrendAnomaly } from "../../domain/ops/trends.js";
import * as opsRepo from "../../repository/opsSeries.repository.js";
import * as incidentRepo from "../../repository/incident.repository.js";

export const trendsService = {
  getTrends(): TrendsResponse {
    const anomalies: TrendAnomaly[] = opsRepo.listAnomalyPerformancePoints().map((point) => {
      const delta = point.target - point.value;
      const pct = point.target === 0 ? 0 : Math.round((delta / point.target) * 100);
      return {
        id: `perf-${point.period}-${point.monthLabel}`,
        title: `${point.monthLabel} performance anomaly`,
        detail: `Performance dropped to ${point.value} vs target ${point.target} (−${pct}% vs target) in period ${point.period}.`,
        severity: "crit" as const,
        period: point.period,
        evidenceRefs: [`performance_series:${point.period}:${point.monthLabel}`],
      };
    });

    const openHigh = incidentRepo
      .listAllIncidents()
      .filter((i) => i.status === "open" && i.severity === "high");
    for (const incident of openHigh) {
      anomalies.push({
        id: `inc-${incident.id}`,
        title: `Open ${incident.severity} incident`,
        detail: `${incident.id}: ${incident.title} (${incident.application})`,
        severity: "warn",
        period: incident.openedAt.slice(0, 7),
        evidenceRefs: [`incident:${incident.id}`],
      });
    }

    return {
      anomalies,
      anomalyCount: anomalies.length,
    };
  },
};
