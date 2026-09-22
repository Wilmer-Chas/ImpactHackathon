import { useAppFilters } from "../../context/AppFilterContext";

type FilterStatusBannerProps = {
  /** Human-readable scope, e.g. "anomalies" or "risk items" */
  noun: string;
  shown: number;
  total: number;
  /** Extra note when timeframe does not apply on this page */
  note?: string;
};

export function FilterStatusBanner({ noun, shown, total, note }: FilterStatusBannerProps) {
  const { isActive, filters, clearFilters } = useAppFilters();
  if (!isActive) return null;

  const parts: string[] = [];
  if (filters.from || filters.to) {
    parts.push(`timeframe ${filters.from ?? "…"} → ${filters.to ?? "…"}`);
  }
  if (filters.wording) {
    parts.push(`wording “${filters.wording}”`);
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-medium">
        Filters on — showing {shown} of {total} {noun}
      </span>
      <span className="text-amber-800/80">({parts.join(" · ")})</span>
      {note && <span className="text-amber-800/70 w-full sm:w-auto">{note}</span>}
      <button
        type="button"
        onClick={clearFilters}
        className="ml-auto text-xs font-medium text-amber-900 underline hover:no-underline"
      >
        Clear filters
      </button>
    </div>
  );
}
