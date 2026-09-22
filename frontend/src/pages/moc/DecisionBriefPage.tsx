import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ChatWidget } from "../../components/chat/ChatWidget";
import { fetchDecisionBrief } from "../../services/api/moc.api";
import { RECOMMENDATION_LABELS, type MocReport, type Recommendation } from "../../types/moc";

function recommendationStyle(rec: Recommendation): string {
  if (rec === "go") return "bg-green-100 text-green-800 border-green-200";
  if (rec === "go_with_conditions") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function findingStyle(severity: string): string {
  if (severity === "critical") return "border-red-200 bg-red-50";
  if (severity === "warning") return "border-orange-200 bg-orange-50";
  return "border-blue-200 bg-blue-50";
}

export function DecisionBriefPage() {
  const { changeId } = useParams<{ changeId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<MocReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!changeId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDecisionBrief(changeId!);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Could not load decision brief");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [changeId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading decision brief…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Decision Brief</h1>
        <p className="text-sm text-gray-500 mb-4">
          {error ?? `No decision brief for change ${changeId}.`}
        </p>
        <div className="flex gap-3">
          <Link to="/moc" className="text-sm text-brand-blue hover:underline">
            Back to MOC briefing
          </Link>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm bg-brand-blue text-white px-4 py-2 rounded-lg"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  const evidenceCounts = {
    incidents: report.evidence.incidents.length,
    processMetrics: report.evidence.processMetrics.length,
    performanceMetrics: report.evidence.performanceMetrics.length,
    dataQuality: report.evidence.dataQuality.length,
    hasRisk: Boolean(report.evidence.riskRecord),
    hasRelease: Boolean(report.evidence.release),
  };

  const reportContext = JSON.stringify({
    change: report.change,
    recommendation: report.recommendation,
    rationale: report.rationale,
    findings: report.findings,
    caveats: report.caveats,
    evidenceCounts,
  });

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Decision brief · Change #{report.change.id}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{report.change.title}</h1>
            <p className="text-sm text-gray-600 max-w-3xl">{report.change.description}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/moc"
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            >
              MOC Agenda
            </Link>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg"
            >
              Home
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-4">
          <span className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
            {report.change.application}
          </span>
          <span className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
            {report.change.changeType}
          </span>
          <span className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
            Owner: {report.change.owner}
          </span>
          <span className="bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
            Status: {report.change.status}
          </span>
        </div>

        <div
          className={`inline-flex items-center px-4 py-2 rounded-lg border font-bold text-sm ${recommendationStyle(
            report.recommendation,
          )}`}
        >
          {RECOMMENDATION_LABELS[report.recommendation]}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Rationale</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {report.rationale}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Findings</h2>
        <div className="space-y-3">
          {report.findings.map((f) => (
            <div key={f.id} className={`border rounded-lg p-4 ${findingStyle(f.severity)}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">{f.severity}</span>
                <span className="text-xs text-gray-500">{f.code}</span>
              </div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-700 mt-1">{f.reason}</p>
              {f.evidenceRefs.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Evidence: {f.evidenceRefs.join(", ")}
                </p>
              )}
            </div>
          ))}
          {report.findings.length === 0 && (
            <p className="text-sm text-gray-500">No findings recorded.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
            Evidence pack
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Incidents: {evidenceCounts.incidents}</li>
            <li>Process metrics: {evidenceCounts.processMetrics}</li>
            <li>Performance metrics: {evidenceCounts.performanceMetrics}</li>
            <li>Data quality issues: {evidenceCounts.dataQuality}</li>
            <li>Risk record: {evidenceCounts.hasRisk ? "present" : "none"}</li>
            <li>Release plan: {evidenceCounts.hasRelease ? "present" : "none"}</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
            Caveats
          </h2>
          {report.caveats.length === 0 ? (
            <p className="text-sm text-gray-500">None listed.</p>
          ) : (
            <ul className="space-y-2 text-sm text-gray-700 list-disc pl-4">
              {report.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ChatWidget
        context={reportContext}
        title={`Decision Brief #${report.change.id} Assistant`}
      />
    </div>
  );
}
