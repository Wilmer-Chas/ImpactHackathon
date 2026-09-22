import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Filter, X } from "lucide-react";
import { useAppFilters } from "../../context/AppFilterContext";
import { normalizePeriod } from "../../lib/applyFilters";

const PRESETS = [
  {
    id: "phishing",
    label: "Wording: phishing",
    filters: { wording: "phishing" },
  },
  {
    id: "aug",
    label: "Aug 2026",
    filters: { from: "2026-08", to: "2026-08" },
  },
  {
    id: "sep",
    label: "Sep 2026",
    filters: { from: "2026-09", to: "2026-09" },
  },
  {
    id: "scoring",
    label: "Wording: scoring",
    filters: { wording: "scoring" },
  },
] as const;

export function AppShell() {
  const { filters, setFilters, clearFilters, isActive } = useAppFilters();
  const [fromDraft, setFromDraft] = useState(filters.from ?? "");
  const [toDraft, setToDraft] = useState(filters.to ?? "");
  const [wordingDraft, setWordingDraft] = useState(filters.wording ?? "");

  useEffect(() => {
    setFromDraft(filters.from ?? "");
    setToDraft(filters.to ?? "");
    setWordingDraft(filters.wording ?? "");
  }, [filters]);

  function applyManualFilters() {
    setFilters({
      from: normalizePeriod(fromDraft),
      to: normalizePeriod(toDraft),
      wording: wordingDraft.trim() || undefined,
    });
  }

  const timeframeLabel =
    filters.from || filters.to
      ? `${filters.from ?? "…"} → ${filters.to ?? "…"}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-brand-blue" />
          <span className="font-semibold text-gray-800">Presentation Generator</span>
        </div>
        <nav className="flex space-x-6 text-sm text-gray-600">
          <NavLink
            to="/"
            end
            className={({ isActive: active }) =>
              active ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Employee Home
          </NavLink>
          <NavLink
            to="/report"
            end
            className={({ isActive: active }) =>
              active ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Fraud Report
          </NavLink>
          <NavLink
            to="/report/risk"
            className={({ isActive: active }) =>
              active ? "text-brand-blue font-medium" : "hover:text-brand-blue"
            }
          >
            Risk Report
          </NavLink>
        </nav>
      </header>

      <div
        className={`border-b px-6 py-3 z-10 relative ${
          isActive ? "bg-amber-50 border-amber-200" : "bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Filter size={12} />
            Display filters
          </span>
          <span className="text-xs text-gray-400">
            Applied here instantly — chat can also set them, but is not required
          </span>
          {isActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs font-medium text-amber-900 underline hover:no-underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            From
            <input
              type="month"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white min-w-[9rem]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500">
            To
            <input
              type="month"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white min-w-[9rem]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 flex-1 min-w-[14rem]">
            Wording
            <input
              type="text"
              value={wordingDraft}
              onChange={(e) => setWordingDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyManualFilters();
              }}
              placeholder="e.g. phishing, scoring, fraud"
              className="border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-800 bg-white"
            />
          </label>
          <button
            type="button"
            onClick={applyManualFilters}
            className="bg-brand-blue text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Apply filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider">Try</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFilters({ ...preset.filters })}
              className="text-xs px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:text-brand-blue"
            >
              {preset.label}
            </button>
          ))}
          {(timeframeLabel || filters.wording) && (
            <>
              <span className="text-gray-300 mx-1">|</span>
              {timeframeLabel && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md text-xs font-medium">
                  Active: {timeframeLabel}
                  <button
                    type="button"
                    aria-label="Clear timeframe"
                    className="text-amber-700 hover:text-amber-950"
                    onClick={() => setFilters({ ...filters, from: undefined, to: undefined })}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filters.wording && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-md text-xs font-medium">
                  Active: “{filters.wording}”
                  <button
                    type="button"
                    aria-label="Clear wording"
                    className="text-amber-700 hover:text-amber-950"
                    onClick={() => setFilters({ ...filters, wording: undefined })}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
