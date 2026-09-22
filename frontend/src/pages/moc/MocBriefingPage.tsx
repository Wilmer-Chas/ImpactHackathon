import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { ChatWidget } from "../../components/chat/ChatWidget";
import { fetchMocBriefing } from "../../services/api/moc.api";
import type { MocBriefing } from "../../types/moc";

function severityClass(severity: string): string {
  if (severity === "critical") return "bg-red-50 border-red-100 text-red-900";
  if (severity === "warning") return "bg-orange-50 border-orange-100 text-orange-900";
  return "bg-blue-50 border-blue-100 text-blue-900";
}

function severityDot(severity: string): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-orange-500";
  return "bg-blue-500";
}

export function MocBriefingPage() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<MocBriefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMocBriefing();
        if (!cancelled) setBriefing(data);
      } catch (err) {
        if (!cancelled) {
          setBriefing(null);
          setError(err instanceof Error ? err.message : "Could not load MOC briefing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading MOC briefing…
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">MOC Briefing</h1>
        <p className="text-sm text-gray-500 mb-4">{error ?? "No briefing available."}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm bg-brand-blue text-white px-4 py-2 rounded-lg"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const reportContext = JSON.stringify({
    meeting: briefing.meeting,
    narrative: briefing.narrative,
    agenda: briefing.agenda,
    postureSummary: {
      openIncidents: briefing.posture.openHighSeverityIncidents.length,
      workload: briefing.posture.workloadPressure.length,
      health: briefing.posture.healthPressure.length,
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20">
      <div className="bg-slate-900 text-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">{briefing.meeting.title}</h1>
            <p className="text-sm text-slate-300 mb-2">
              {briefing.narrative.titleSummary || briefing.meeting.portfolio}
            </p>
            <p className="text-xs text-slate-400">
              Prepared by {briefing.meeting.preparedBy} · {briefing.meeting.preparedAt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm bg-slate-700 hover:bg-slate-600 border border-slate-500 px-4 py-2 rounded"
          >
            Back to Home
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Org risk posture</h2>
        <p className="text-sm text-gray-700 mb-6 leading-relaxed">
          {briefing.narrative.postureSummary}
        </p>
        <div className="space-y-3">
          {briefing.narrative.postureSignals.map((signal) => (
            <div
              key={signal.id}
              className={`flex items-start gap-4 p-4 rounded-lg border ${severityClass(signal.severity)}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${severityDot(signal.severity)}`} />
              <div>
                <h3 className="font-semibold">{signal.headline}</h3>
                <p className="text-sm mt-1 opacity-90">{signal.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Agenda</h2>
        <p className="text-sm text-gray-600 mb-6">{briefing.narrative.agendaIntro}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Change
                </th>
                <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Application
                </th>
                <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Residual
                </th>
                <th className="p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Brief
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {briefing.agenda.map((item) => (
                <tr key={item.changeId} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">#{item.changeId}</p>
                    {briefing.narrative.agendaNotes[item.changeId] && (
                      <p className="text-xs text-gray-600 mt-1">
                        {briefing.narrative.agendaNotes[item.changeId]}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-700">{item.application}</td>
                  <td className="p-3 text-sm text-gray-700">{item.changeType}</td>
                  <td className="p-3 text-sm text-gray-700">{item.residualRisk ?? "—"}</td>
                  <td className="p-3">
                    <Link
                      to={`/moc/${item.changeId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
                    >
                      Open <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ChatWidget context={reportContext} title="MOC Briefing Assistant" />
    </div>
  );
}
