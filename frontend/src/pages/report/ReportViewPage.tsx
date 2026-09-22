import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import pptxgen from "pptxgenjs";
import { Download } from "lucide-react";
import { ChatWidget } from "../../components/chat/ChatWidget";
import { FilterStatusBanner } from "../../components/filters/FilterStatusBanner";
import { useAppFilters } from "../../context/AppFilterContext";
import { chartMonthPeriod, filterByAppFilters } from "../../lib/applyFilters";
import {
  fetchLatestMonthlyReport,
  fetchMonthlyReport,
  generateMonthlyReport,
} from "../../services/api/ops.api";
import type { MonthlyReport } from "../../types/ops";

const SOURCE_LABELS = [
  "process_performance.csv",
  "incidents.csv",
  "crqs.csv",
  "risk_matrix.csv",
];

type LocationState = {
  sources?: string[];
  reportTitle?: string;
};

export function ReportViewPage() {
  const { period } = useParams<{ period?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;
  const { filters } = useAppFilters();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (period === "risk" || period === "general") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = period
          ? await fetchMonthlyReport(period)
          : await fetchLatestMonthlyReport();
        if (!cancelled) {
          setReport(data);
          if (!period) {
            navigate(`/report/${data.period}`, { replace: true });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Could not load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period, navigate]);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateMonthlyReport(
        period === "risk" || period === "general" ? undefined : period,
      );
      setReport(data);
      navigate(`/report/${data.period}`, { replace: true, state });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setGenerating(false);
    }
  }

  function exportToPPT() {
    if (!report) return;
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
    slide1.addText(report.subtitle, {
      x: 0.5,
      y: 1.3,
      w: "90%",
      h: 0.4,
      fontSize: 14,
      color: "64748B",
    });

    const slide2 = pres.addSlide();
    slide2.addText("What happened", {
      x: 0.5,
      y: 0.5,
      w: "90%",
      fontSize: 20,
      bold: true,
      color: "1E293B",
    });
    slide2.addText(
      report.narrative.bullets.map((b) => ({ text: b, options: { bullet: true } })),
      { x: 0.5, y: 1.2, w: "90%", h: 3, fontSize: 14, color: "334155" },
    );
    slide2.addText(report.narrative.momSummary, {
      x: 0.5,
      y: 4.5,
      w: "90%",
      h: 0.5,
      fontSize: 12,
      color: "0F766E",
    });

    void pres
      .writeFile({ fileName: `Fraud_Report_${report.period}.pptx` })
      .then(() => setIsExporting(false))
      .catch(() => setIsExporting(false));
  }

  if (period === "risk" || period === "general") {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-sm text-gray-500">Loading monthly report…</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Fraud Detection — Monthly Report
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          {error ?? "No monthly report yet. Generate one from evidence."}
        </p>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating}
          className="text-sm bg-brand-blue text-white px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate monthly report"}
        </button>
      </div>
    );
  }

  const sources = state?.sources?.length ? state.sources : SOURCE_LABELS;

  const filteredPerformance = filterByAppFilters(
    report.performance,
    { from: filters.from, to: filters.to },
    (p) => chartMonthPeriod(report.period, p.monthLabel),
    () => [],
  );
  const filteredNew = filterByAppFilters(
    report.riskRegister.new,
    filters,
    (r) => r.period,
    (r) => [r.summary, r.riskId],
  );
  const filteredResolved = filterByAppFilters(
    report.riskRegister.resolved,
    filters,
    (r) => r.period,
    (r) => [r.summary, r.riskId],
  );
  const riskShown = filteredNew.length + filteredResolved.length;
  const riskTotal = report.riskRegister.new.length + report.riskRegister.resolved.length;

  const chartData = filteredPerformance.map((p) => ({
    name: p.monthLabel,
    value: p.value,
    fill: p.isAnomaly ? "#EF4444" : "#6366F1",
  }));
  const target = filteredPerformance[0]?.target ?? report.performance[0]?.target ?? 90;
  const anomaly = filteredPerformance.find((p) => p.isAnomaly);
  const anomalyDelta = anomaly ? anomaly.target - anomaly.value : 0;

  const reportContext = JSON.stringify({
    reportType: report.title,
    period: report.period,
    narrative: report.narrative,
    performance: filteredPerformance,
    riskRegister: {
      new: filteredNew,
      resolved: filteredResolved,
      unchangedCount: report.riskRegister.unchangedCount,
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20">
      <FilterStatusBanner
        noun="risk entries"
        shown={riskShown}
        total={riskTotal}
        note={
          filters.from || filters.to
            ? `Chart months: ${filteredPerformance.length} of ${report.performance.length}`
            : undefined
        }
      />

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-brand-blue text-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mb-1">{report.title}</h1>
            <p className="text-sm text-white/80 mb-3">{report.subtitle}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-xs bg-blue-800 hover:bg-blue-900 border border-blue-700 px-3 py-1.5 rounded-lg"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => void onGenerate()}
              disabled={generating}
              className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              {generating ? "Refreshing…" : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={exportToPPT}
              disabled={isExporting}
              className="flex items-center gap-2 text-xs bg-white text-brand-blue hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium"
            >
              {isExporting ? (
                <div className="w-3.5 h-3.5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isExporting ? "Generating…" : "Export to PPT"}
            </button>
          </div>
        </div>
        <div className="bg-white/10 rounded-lg p-3 inline-block mt-2 border border-white/20">
          <p className="text-xs font-medium text-white flex flex-wrap items-center gap-2">
            <span className="uppercase tracking-wider opacity-70">Source Data:</span>
            {sources.map((label) => (
              <span key={label} className="bg-white/20 px-2 py-1 rounded">
                {label}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-semibold text-gray-800">Performance vs. target</h2>
              {anomaly && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  Anomaly: −{anomalyDelta} vs. target
                </span>
              )}
            </div>
            <div className="h-64 mt-4">
              {chartData.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No performance points match the active filters.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={target}
                      stroke="#9CA3AF"
                      strokeDasharray="3 3"
                      label={{
                        position: "right",
                        value: "target",
                        fill: "#6B7280",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">What happened</h3>
            <ul className="space-y-4 text-sm text-gray-700 list-disc pl-4 marker:text-brand-blue">
              {report.narrative.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-teal-50 border-t border-teal-100 px-8 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-teal-600 px-2 py-0.5 rounded">
              Month-over-month
            </span>
            <span className="text-sm text-teal-900">{report.narrative.momSummary}</span>
          </div>
          <span className="text-xs text-teal-700/70">
            Compliance-checked · Audit ID {report.narrative.auditId}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{report.compareLabel}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Compares this run&apos;s structured data against the same tables from last month&apos;s
          run.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded mb-3 flex justify-between">
              <span>NEW</span>
              <span>{filteredNew.length}</span>
            </div>
            <div className="space-y-3">
              {filteredNew.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded p-3 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    {r.riskId}
                  </span>
                  <p className="text-sm text-gray-800">{r.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded mb-3 flex justify-between">
              <span>RESOLVED</span>
              <span>{filteredResolved.length}</span>
            </div>
            <div className="space-y-3">
              {filteredResolved.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-200 rounded p-3 shadow-sm opacity-60"
                >
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    {r.riskId}
                  </span>
                  <p className="text-sm text-gray-800 line-through">{r.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded mb-3 flex justify-between">
              <span>UNCHANGED</span>
              <span>{report.riskRegister.unchangedCount}</span>
            </div>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded p-3 shadow-sm text-gray-500 text-sm">
                <span className="text-gray-800 font-medium block">carried over</span>
                No status change since prior month — excluded from the narrative to keep it short.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChatWidget context={reportContext} title="Fraud Report Assistant" />
    </div>
  );
}
