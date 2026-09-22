import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { applyPiiFlagAction, fetchAdminOverview } from "../../services/api/admin.api";
import type { AdminOverview, PiiFlagAction } from "../../types/admin";

const BAR_COLORS = ["bg-brand-blue", "bg-green-500", "bg-orange-400"];

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchAdminOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load admin overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onAction(id: string, action: PiiFlagAction) {
    setActingId(id);
    try {
      await applyPiiFlagAction(id, action);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActingId(null);
    }
  }

  if (loading && !overview) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <p className="text-sm text-gray-500">Loading admin dashboard…</p>
      </div>
    );
  }

  const kpis = overview?.kpis;
  const chartData =
    overview?.runsSeries.map((r) => ({
      name: r.monthLabel,
      runs: r.runs,
      flags: r.flags,
    })) ?? [];
  const flagged = overview?.flagged ?? [];
  const models = overview?.models ?? [];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          The control point between employees and the model: review flagged requests, watch usage.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-brand-blue">{kpis?.runs ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Runs this month</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-brand-blue">{kpis?.scanned ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Incidents scanned</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
          <p className="text-3xl font-bold text-red-500">{kpis?.flagged ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Flagged, awaiting you</p>
          {(kpis?.flagged ?? 0) > 0 && (
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
          )}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-brand-blue">{kpis?.activeUsers ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Active users</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-3xl font-bold text-brand-blue">{kpis?.approvedModels ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">Approved models</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Runs & PII flags over time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "#F3F4F6" }} />
                <Bar dataKey="runs" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Model usage & status</h3>
          <div className="space-y-6">
            {models.map((model, i) => (
              <div key={model.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{model.name}</span>
                  <span className="text-gray-500">{model.sharePercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`${BAR_COLORS[i % BAR_COLORS.length]} h-2 rounded-full`}
                    style={{ width: `${model.sharePercent}%` }}
                  />
                </div>
                <span
                  className={`inline-block mt-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    model.enabled
                      ? "text-green-600 bg-green-50"
                      : "text-gray-500 bg-gray-100"
                  }`}
                >
                  {model.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 bg-gray-50/50 p-6 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Flagged for Review</h3>
            <p className="text-sm text-gray-500">
              Already auto-masked — flagged because the risk score stayed at or above 60.
            </p>
          </div>
          <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">
            {flagged.length} pending
          </span>
        </div>

        <div className="space-y-3">
          {flagged.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="flex gap-4 items-start">
                <div className="w-24 shrink-0">
                  <span className="font-semibold text-sm text-gray-900 block">{item.id}</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase font-medium mt-1 inline-block">
                    auto-masked
                  </span>
                </div>
                <p className="text-sm text-gray-700 max-w-2xl leading-relaxed">
                  {item.description.split(/(\[[^\]]+\])/g).map((part, idx) =>
                    part.startsWith("[") ? (
                      <span
                        key={`${item.id}-${idx}`}
                        className="bg-blue-100 text-blue-800 px-1 rounded mx-1 font-medium text-xs"
                      >
                        {part}
                      </span>
                    ) : (
                      <span key={`${item.id}-${idx}`}>{part}</span>
                    ),
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                  Risk {item.score}/100 : {item.factors.join(" + ")}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => void onAction(item.id, "approve")}
                    className="text-xs px-3 py-1.5 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => void onAction(item.id, "redact")}
                    className="text-xs px-3 py-1.5 rounded bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Redact
                  </button>
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => void onAction(item.id, "reject")}
                    className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {flagged.length === 0 && (
            <p className="text-sm text-gray-500">No pending flags.</p>
          )}
        </div>
      </div>
    </div>
  );
}
