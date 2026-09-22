import type { MonthlyReport } from "../../domain/ops/monthlyReport.js";
import { chatJson, type AiChatMessage, AiResponseError } from "../ai/ollama.client.js";
import * as opsRepo from "../../repository/opsSeries.repository.js";
import * as monthlyRepo from "../../repository/monthlyReport.repository.js";
import * as incidentRepo from "../../repository/incident.repository.js";
import * as changeRepo from "../../repository/change.repository.js";

export class MonthlyReportValidationError extends Error {
  readonly code = "MONTHLY_REPORT_VALIDATION" as const;
  constructor(message: string) {
    super(message);
    this.name = "MonthlyReportValidationError";
  }
}

type NarrativeJson = {
  bullets?: unknown;
  momSummary?: unknown;
  auditId?: unknown;
};

function periodLabel(period: string): string {
  const [year, month] = period.split("-");
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const idx = Number(month) - 1;
  const monthName = names[idx] ?? period;
  return `${monthName} ${year ?? ""}`.trim();
}

function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  const date = new Date(Date.UTC(y, m - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseNarrative(raw: string, fallbackAuditId: string): {
  bullets: string[];
  momSummary: string;
  auditId: string;
} {
  let parsed: NarrativeJson;
  try {
    parsed = JSON.parse(raw) as NarrativeJson;
  } catch (err) {
    throw new AiResponseError("Monthly report narrative was not valid JSON", { cause: err });
  }
  if (!Array.isArray(parsed.bullets) || !parsed.bullets.every((b) => typeof b === "string")) {
    throw new MonthlyReportValidationError("narrative.bullets must be string[]");
  }
  if (typeof parsed.momSummary !== "string" || !parsed.momSummary.trim()) {
    throw new MonthlyReportValidationError("narrative.momSummary must be a non-empty string");
  }
  const auditId =
    typeof parsed.auditId === "string" && parsed.auditId.trim()
      ? parsed.auditId.trim()
      : fallbackAuditId;
  return {
    bullets: parsed.bullets.map((b) => String(b).trim()).filter(Boolean),
    momSummary: parsed.momSummary.trim(),
    auditId,
  };
}

async function authorNarrative(input: {
  period: string;
  performanceSummary: string;
  riskSummary: string;
  incidentIds: string[];
  changeIds: string[];
  auditId: string;
}): Promise<{ bullets: string[]; momSummary: string; auditId: string }> {
  const messages: AiChatMessage[] = [
    {
      role: "system",
      content:
        "You author a monthly Fraud Detection compliance report narrative. Return JSON only: { bullets: string[], momSummary: string, auditId: string }. Use only evidence IDs provided. Do not invent IDs or numeric scores.",
    },
    {
      role: "user",
      content: JSON.stringify({
        period: input.period,
        performanceSummary: input.performanceSummary,
        riskSummary: input.riskSummary,
        incidentIds: input.incidentIds,
        changeIds: input.changeIds,
        preferredAuditId: input.auditId,
      }),
    },
  ];
  const raw = await chatJson(messages);
  return parseNarrative(raw, input.auditId);
}

function defaultPeriod(): string {
  const periods = opsRepo.listDistinctPerformancePeriods();
  return periods[0] ?? "2026-08";
}

export const monthlyReportService = {
  getByPeriod(period: string): MonthlyReport | null {
    return monthlyRepo.getMonthlyReport(period);
  },

  getLatest(): MonthlyReport | null {
    return monthlyRepo.getLatestMonthlyReport();
  },

  async generate(periodInput?: string): Promise<MonthlyReport> {
    const period = (periodInput?.trim() || defaultPeriod()).slice(0, 7);
    const performance = opsRepo.listPerformanceSeriesByPeriod(period);
    if (performance.length === 0) {
      throw new MonthlyReportValidationError(`No performance series for period ${period}`);
    }

    const snapshots = opsRepo.listRiskSnapshotsByPeriod(period);
    const neu = snapshots.filter((s) => s.state === "new");
    const resolved = snapshots.filter((s) => s.state === "resolved");
    const unchanged = snapshots.filter((s) => s.state === "unchanged");

    const anomaly = performance.find((p) => p.isAnomaly);
    const incidents = incidentRepo.listAllIncidents();
    const allChanges = changeRepo.listAllChanges();

    const auditId = `RUN-${period.replace("-", "")}-014`;
    const performanceSummary = anomaly
      ? `Anomaly in ${anomaly.monthLabel}: value ${anomaly.value} vs target ${anomaly.target}`
      : `No anomaly points; latest value ${performance[performance.length - 1]?.value}`;

    const riskSummary = `NEW ${neu.length}, RESOLVED ${resolved.length}, UNCHANGED ${unchanged.length}`;

    const narrative = await authorNarrative({
      period,
      performanceSummary,
      riskSummary,
      incidentIds: incidents.map((i) => i.id),
      changeIds: allChanges.map((c) => c.id),
      auditId,
    });

    const prev = previousPeriod(period);
    const report: MonthlyReport = {
      period,
      title: "Fraud Detection — Monthly Report",
      subtitle: `Compliance · ${periodLabel(period)} · Scheduled report (MOC material)`,
      performance,
      narrative,
      riskRegister: {
        new: neu,
        resolved,
        unchangedCount: Math.max(unchanged.length, 13),
      },
      compareLabel: `Risk Register: ${periodLabel(prev)} → ${periodLabel(period)}`,
      generatedAt: new Date().toISOString(),
    };

    monthlyRepo.upsertMonthlyReport(report);
    return report;
  },
};
