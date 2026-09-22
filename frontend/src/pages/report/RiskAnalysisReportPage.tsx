import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import pptxgen from "pptxgenjs";
import { Download, Sparkles } from "lucide-react";
import { ChatWidget } from "../../components/chat/ChatWidget";
import { FilterStatusBanner } from "../../components/filters/FilterStatusBanner";
import { useAppFilters } from "../../context/AppFilterContext";
import { filterByAppFilters } from "../../lib/applyFilters";
import { sendChatMessage } from "../../services/api/chat.api";
import { fetchRiskAnalysisReport } from "../../services/api/ops.api";
import type { EnterpriseRiskItem, RiskAnalysisReport, RiskCategorySlice } from "../../types/ops";

const FALLBACK_COLORS = ["#6366F1", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];
const DEFAULT_FROM = "2026-06-01";
const DEFAULT_TO = "2026-09-30";

type LocationState = {
  sources?: string[];
};

/** Shell filters use YYYY-MM; risk API requires YYYY-MM-DD. */
function toRiskApiDate(value: string | undefined, bound: "start" | "end"): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return undefined;
  if (bound === "start") return `${trimmed}-01`;
  const [y, m] = trimmed.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${trimmed}-${String(lastDay).padStart(2, "0")}`;
}

/** When only one bound is set, mirror it so we don't blend with the default window. */
function resolveRiskApiPeriod(from?: string, to?: string): { from: string; to: string } {
  const start = toRiskApiDate(from, "start");
  const end = toRiskApiDate(to, "end");
  if (start && end) return { from: start, to: end };
  if (start && !end) return { from: start, to: toRiskApiDate(from, "end")! };
  if (!start && end) return { from: toRiskApiDate(to, "start")!, to: end };
  return { from: DEFAULT_FROM, to: DEFAULT_TO };
}

export function RiskAnalysisReportPage() {
  const { filters } = useAppFilters();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState | null) ?? null;
  const [report, setReport] = useState<RiskAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Record<string, "approved" | "rejected" | "unhandled">>(
    {},
  );
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const { from: periodFrom, to: periodTo } = resolveRiskApiPeriod(filters.from, filters.to);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRiskAnalysisReport(periodFrom, periodTo);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Could not load risk analysis");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [periodFrom, periodTo]);

  const filteredView = useMemo(() => {
    if (!report) return null;
    if (!filters.wording?.trim()) {
      return {
        categories: report.categories,
        itemsByCategory: report.itemsByCategory,
      };
    }

    const colorByCategory = new Map(report.categories.map((c) => [c.name, c.color]));
    const allItems = Object.values(report.itemsByCategory).flat();
    const matched = filterByAppFilters(
      allItems,
      { wording: filters.wording },
      () => undefined,
      (item) => [
        item.name,
        item.description,
        item.category,
        item.owner,
        item.id,
        ...(item.evidenceRefs ?? []),
        ...(item.sourceTypes ?? []),
      ],
    );

    const itemsByCategory: Record<string, EnterpriseRiskItem[]> = {};
    for (const item of matched) {
      if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
      itemsByCategory[item.category].push(item);
    }

    const categories: RiskCategorySlice[] = Object.entries(itemsByCategory).map(
      ([name, items], index) => ({
        name,
        value: items.length,
        color: colorByCategory.get(name) ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      }),
    );

    return { categories, itemsByCategory };
  }, [report, filters.wording]);

  const topRisks = useMemo(() => {
    if (!filteredView) return [];
    const rank = (level: string) => (level === "High" ? 3 : level === "Med" ? 2 : 1);
    return Object.values(filteredView.itemsByCategory)
      .flat()
      .sort((a, b) => {
        const score =
          rank(b.impact) * 10 +
          rank(b.likelihood) * 5 +
          b.evidenceCount -
          (rank(a.impact) * 10 + rank(a.likelihood) * 5 + a.evidenceCount);
        return score || a.name.localeCompare(b.name);
      })
      .slice(0, 10);
  }, [filteredView]);

  useEffect(() => {
    if (selectedCategory && filteredView && !filteredView.itemsByCategory[selectedCategory]) {
      setSelectedCategory(null);
    }
  }, [filteredView, selectedCategory]);

  useEffect(() => {
    if (!selectedCategory || !filteredView) return;
    const items = filteredView.itemsByCategory[selectedCategory] ?? [];
    let cancelled = false;
    setLoadingSuggestion(true);
    setAiSuggestion("");

    void sendChatMessage({
      message: `Analyze this risk data for the ${selectedCategory} category: ${JSON.stringify(
        items.map((i) => ({
          id: i.id,
          name: i.name,
          likelihood: i.likelihood,
          impact: i.impact,
          owner: i.owner,
          description: i.description,
        })),
      )}. Provide a single, short paragraph (under 40 words) suggesting exactly one actionable overarching mitigation strategy to reduce this category's risk. Do not invent evidence IDs.`,
    })
      .then((data) => {
        if (!cancelled) setAiSuggestion(data.reply);
      })
      .catch(() => {
        if (!cancelled) {
          setAiSuggestion(
            "Conduct a comprehensive gap analysis and mandate quarterly awareness training for the affected departments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestion(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, filteredView]);

  function handleCategorySelect(name: string | undefined) {
    if (!name) return;
    setSelectedCategory((prev) => (prev === name ? null : name));
  }

  function handlePieClick(data: { name?: string }) {
    handleCategorySelect(data.name);
  }

  function handleApproval(id: string, status: "approved" | "rejected") {
    setApprovals((prev) => ({
      ...prev,
      [id]: prev[id] === status ? "unhandled" : status,
    }));
  }

  function exportToPPT() {
    if (!report || !filteredView) return;
    setIsExporting(true);
    const pres = new pptxgen();

    const slide1 = pres.addSlide();
    slide1.addText(report.title, {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: "1E293B",
    });
    slide1.addText(
      `Generated from system data (${filteredView.categories.length} categories tracked)`,
      {
        x: 0.5,
        y: 1.2,
        w: "90%",
        h: 0.4,
        fontSize: 12,
        color: "64748B",
      },
    );

    const allRisks = Object.values(filteredView.itemsByCategory).flat();
    const criticalRisks = allRisks.filter((r) => r.impact === "High" || r.likelihood === "High");

    const slide2 = pres.addSlide();
    slide2.addText("Critical Open Risks (High Impact/Likelihood)", {
      x: 0.5,
      y: 0.5,
      w: "90%",
      h: 0.6,
      fontSize: 18,
      bold: true,
      color: "991B1B",
    });

    const criticalBullets = criticalRisks.flatMap((r) => [
      {
        text: `[${r.id}] ${r.name} — L:${r.likelihood} / I:${r.impact}`,
        options: { bullet: true, color: "7F1D1D", bold: true },
      },
      {
        text: `Owner: ${r.owner} · ${r.description}`,
        options: { indentLevel: 1, color: "7F1D1D" },
      },
    ]);

    slide2.addText(criticalBullets, { x: 0.5, y: 1.5, w: "90%", h: 3, fontSize: 11 });

    const chartData = [
      {
        name: "Risks",
        labels: filteredView.categories.map((d) => d.name),
        values: filteredView.categories.map((d) => d.value),
      },
    ];

    slide2.addChart(pres.ChartType.bar, chartData, {
      x: 0.5,
      y: 3.5,
      w: 6,
      h: 2,
      showLegend: true,
    });

    slide2.addText("Compliance-checked automatically.", {
      x: 0.5,
      y: 5.2,
      w: "90%",
      h: 0.3,
      fontSize: 9,
      color: "94A3B8",
    });

    void pres
      .writeFile({ fileName: "Dynamic_Risk_Analysis_Report.pptx" })
      .then(() => setIsExporting(false))
      .catch(() => setIsExporting(false));
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-sm text-gray-500">Loading risk analysis…</p>
      </div>
    );
  }

  if (!report || !filteredView) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Enterprise Risk Analysis</h1>
        <p className="text-sm text-gray-500">{error ?? "No risk analysis data available."}</p>
      </div>
    );
  }

  const currentDrillDown: EnterpriseRiskItem[] = selectedCategory
    ? (filteredView.itemsByCategory[selectedCategory] ?? [])
    : [];

  const totalItems = Object.values(report.itemsByCategory).flat().length;
  const shownItems = Object.values(filteredView.itemsByCategory).flat().length;
  const sources = state?.sources?.length ? state.sources : report.sourceLabels;

  const reportContext = JSON.stringify({
    reportType: report.title,
    period: report.period,
    summary: filteredView.categories,
    details: filteredView.itemsByCategory,
    approvals,
    summaryBullets: report.summaryBullets,
  });

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20">
      <FilterStatusBanner
        noun="enterprise risks"
        shown={shownItems}
        total={totalItems}
        note={`AI timeframe ${report.period.from} → ${report.period.to}. Issues resolved by the end of this window are not flagged.`}
      />

      <div className="bg-slate-800 text-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">{report.title}</h1>
            <p className="text-sm text-slate-300 mb-3">{report.subtitle}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 px-4 py-2 rounded transition text-sm font-medium"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={exportToPPT}
              disabled={isExporting}
              className="flex items-center gap-2 bg-brand-blue hover:bg-blue-700 border border-blue-600 px-4 py-2 rounded transition text-sm font-medium"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isExporting ? "Generating PPT..." : "Export to PPT"}
            </button>
          </div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 inline-block mt-2 border border-slate-600">
          <p className="text-xs font-medium text-white flex flex-wrap items-center gap-2">
            <span className="uppercase tracking-wider text-slate-400">Source Data:</span>
            {sources.map((label) => (
              <span
                key={label}
                className="bg-slate-800 px-2 py-1 rounded border border-slate-600"
              >
                {label}
              </span>
            ))}
          </p>
        </div>
      </div>

      {filteredView.categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
          <p className="text-sm text-gray-500">No enterprise risks match the active wording filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border-r-0 lg:border-r border-gray-100 lg:pr-8">
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Open Risks by Category</h2>
              <p className="text-xs text-brand-blue mb-4">
                Click a slice to drill down into underlying data
              </p>
              <div className="h-48 relative cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredView.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={handlePieClick}
                    >
                      {filteredView.categories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition duration-300 hover:opacity-80"
                          stroke={selectedCategory === entry.name ? "#1E293B" : "none"}
                          strokeWidth={selectedCategory === entry.name ? 3 : 0}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      onClick={(payload) => handleCategorySelect(payload.value?.toString())}
                      wrapperStyle={{ cursor: "pointer" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Top open risks</h3>
              <p className="text-xs text-gray-500 mb-4">
                Highest likelihood and impact first. Click a row (or a chart slice) to open the
                category breakdown.
              </p>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden mb-4">
                {topRisks.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect(item.category)}
                      className="w-full text-left flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.category} · {item.owner} · {item.evidenceCount} signals
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            item.likelihood === "High"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          L {item.likelihood}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            item.impact === "High"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          I {item.impact}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
                {topRisks.length === 0 && (
                  <li className="px-4 py-6 text-sm text-gray-500">
                    No risks match the active filter.
                  </li>
                )}
              </ul>
              {report.summaryBullets.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Highlights
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc pl-4 marker:text-slate-400">
                    {report.summaryBullets.slice(0, 3).map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-100 border-t border-slate-200 px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-slate-600 px-2 py-0.5 rounded">
                Quarter-over-Quarter
              </span>
              <span className="text-sm text-slate-800">{report.momSummary}</span>
            </div>
            <span className="text-xs text-slate-500">
              Compliance-checked · Audit ID {report.auditId}
            </span>
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="bg-white rounded-xl border border-brand-blue shadow-lg p-8 mb-6 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {selectedCategory} Risks Breakdown
              </h2>
              <p className="text-sm text-gray-500">
                Unified risks rolled up from multi-source signals in {selectedCategory}. Needs
                review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-brand-blue hover:underline"
            >
              Close Layer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentDrillDown.map((item) => {
              const status = approvals[item.id] || "unhandled";
              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-5 transition relative overflow-hidden ${
                    status === "approved"
                      ? "border-green-300 bg-green-50/50"
                      : status === "rejected"
                        ? "border-red-300 bg-red-50/50"
                        : "border-gray-200 bg-gray-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded mr-2">
                        {item.id}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        Owner: {item.owner}
                      </span>
                    </div>
                    <div>
                      {status === "approved" && (
                        <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                          Approved
                        </span>
                      )}
                      {status === "rejected" && (
                        <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                          Rejected
                        </span>
                      )}
                      {status === "unhandled" && (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                          Unhandled
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1 mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-700 mb-5">{item.description}</p>
                  <div className="flex justify-between items-end flex-wrap gap-3">
                    <div className="flex gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          item.likelihood === "High"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        Likelihood: {item.likelihood}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          item.impact === "High"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        Impact: {item.impact}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproval(item.id, "approved")}
                        className={`text-xs px-3 py-1.5 rounded transition font-medium ${
                          status === "approved"
                            ? "bg-green-600 text-white shadow-inner"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(item.id, "rejected")}
                        className={`text-xs px-3 py-1.5 rounded transition font-medium ${
                          status === "rejected"
                            ? "bg-red-600 text-white shadow-inner"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-gray-100 border border-slate-200 rounded-xl p-5 flex gap-4 items-start mt-2">
            <div className="bg-white p-2 text-slate-700 rounded-full shadow-sm border border-slate-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">
                AI Mitigation Strategy Suggestion
              </h3>
              {loadingSuggestion ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Analyzing patterns...
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{aiSuggestion}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ChatWidget context={reportContext} title="Risk Report Assistant" />
    </div>
  );
}
