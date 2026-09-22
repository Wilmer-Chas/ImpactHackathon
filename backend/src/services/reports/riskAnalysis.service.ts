import type {
  EnterpriseRiskItem,
  RiskAnalysisPeriod,
  RiskAnalysisReport,
  RiskCategorySlice,
} from "../../domain/ops/riskAnalysis.js";
import * as riskReportRepo from "../../repository/riskAnalysisReport.repository.js";
import { listUnifiedRisks } from "../risk/riskIntelligence.service.js";

const CATEGORY_COLORS: Record<string, string> = {
  Cyber: "#EF4444",
  Operational: "#F59E0B",
  Regulatory: "#3B82F6",
  IT: "#10B981",
};

const CATEGORY_ORDER = ["Cyber", "Operational", "Regulatory", "IT"];

/** Default demo window covering seeded incident / note dates. */
export const DEFAULT_RISK_PERIOD: RiskAnalysisPeriod = {
  from: "2026-06-01",
  to: "2026-09-30",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeRiskPeriod(
  from?: string | null,
  to?: string | null,
): RiskAnalysisPeriod {
  const f = from?.trim() || DEFAULT_RISK_PERIOD.from;
  const t = to?.trim() || DEFAULT_RISK_PERIOD.to;
  if (!DATE_RE.test(f) || !DATE_RE.test(t)) {
    throw new RiskPeriodValidationError("from and to must be YYYY-MM-DD dates");
  }
  if (f > t) {
    throw new RiskPeriodValidationError("from must be on or before to");
  }
  return { from: f, to: t };
}

export class RiskPeriodValidationError extends Error {
  readonly code = "RISK_PERIOD_INVALID" as const;
  constructor(message: string) {
    super(message);
    this.name = "RiskPeriodValidationError";
  }
}

function groupByCategory(items: EnterpriseRiskItem[]): Record<string, EnterpriseRiskItem[]> {
  const grouped: Record<string, EnterpriseRiskItem[]> = {};
  for (const item of items) {
    const list = grouped[item.category] ?? [];
    list.push(item);
    grouped[item.category] = list;
  }
  return grouped;
}

function buildCategories(grouped: Record<string, EnterpriseRiskItem[]>): RiskCategorySlice[] {
  const names = [
    ...CATEGORY_ORDER.filter((name) => grouped[name]?.length),
    ...Object.keys(grouped).filter((name) => !CATEGORY_ORDER.includes(name)),
  ];
  return names.map((name) => ({
    name,
    value: grouped[name]?.length ?? 0,
    color: CATEGORY_COLORS[name] ?? "#64748B",
  }));
}

function buildSummaryBullets(items: EnterpriseRiskItem[]): string[] {
  return items.slice(0, 5).map((item) => {
    return `${item.name} · ${item.likelihood} likelihood · ${item.impact} impact · ${item.evidenceCount} signals`;
  });
}

function buildMomSummary(items: EnterpriseRiskItem[], signalCount: number): string {
  const highImpact = items.filter((i) => i.impact === "High").length;
  const highLikelihood = items.filter((i) => i.likelihood === "High").length;
  return `${items.length} risks · ${signalCount} signals still open at period end · ${highLikelihood} high likelihood · ${highImpact} high impact`;
}

function assembleReport(
  period: RiskAnalysisPeriod,
  items: EnterpriseRiskItem[],
  signalCount: number,
): RiskAnalysisReport {
  const itemsByCategory = groupByCategory(items);
  const categories = buildCategories(itemsByCategory);
  const generatedAt = new Date().toISOString();

  return {
    title: `Enterprise Risk Analysis — ${period.from} → ${period.to}`,
    subtitle: `AI rollup for timeframe ${period.from} to ${period.to} · issues resolved by period end are excluded`,
    period,
    generatedAt,
    categories,
    itemsByCategory,
    summaryBullets: buildSummaryBullets(items),
    momSummary: buildMomSummary(items, signalCount),
    auditId: `RSK-${period.from}-${period.to}`,
    sourceLabels: ["incidents", "ops alerts", "customer notes"],
    signalCount,
  };
}

export const riskAnalysisService = {
  /**
   * Return cached report for the period, or compile a new one.
   * Changing from/to compiles a distinct report (new period key).
   */
  async getReport(from?: string | null, to?: string | null): Promise<RiskAnalysisReport | null> {
    const period = normalizeRiskPeriod(from, to);
    const cached = riskReportRepo.getRiskAnalysisReport(period.from, period.to);
    if (cached) return cached;
    return this.generateReport(period.from, period.to);
  },

  /** Force a fresh AI compile for the timeframe and persist it. */
  async generateReport(from?: string | null, to?: string | null): Promise<RiskAnalysisReport | null> {
    const period = normalizeRiskPeriod(from, to);
    const items = await listUnifiedRisks(period);
    if (items.length === 0) return null;

    const signalCount = items.reduce((sum, i) => sum + i.evidenceCount, 0);
    const report = assembleReport(period, items, signalCount);
    riskReportRepo.upsertRiskAnalysisReport(report);
    return report;
  },
};
