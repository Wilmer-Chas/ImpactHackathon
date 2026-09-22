import type { AppFilters } from "../types/filters";

const PERIOD_RE = /^\d{4}-\d{2}$/;

const MONTH_LABEL_TO_MM: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

export function isFilterActive(filters: AppFilters): boolean {
  return Boolean(filters.from || filters.to || filters.wording?.trim());
}

export function normalizeFilters(input: AppFilters): AppFilters {
  const from = normalizePeriod(input.from);
  const to = normalizePeriod(input.to);
  const wording = input.wording?.trim() || undefined;
  const next: AppFilters = {};
  if (from) next.from = from;
  if (to) next.to = to;
  if (wording) next.wording = wording;
  return next;
}

export function normalizePeriod(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return PERIOD_RE.test(trimmed) ? trimmed : undefined;
}

/** Map a fraud-report chart point (shared report period + month label) to YYYY-MM. */
export function chartMonthPeriod(reportPeriod: string, monthLabel: string): string {
  const year = reportPeriod.slice(0, 4);
  const mm = MONTH_LABEL_TO_MM[monthLabel];
  return mm ? `${year}-${mm}` : reportPeriod;
}

export function periodInRange(
  period: string | undefined,
  filters: AppFilters,
): boolean {
  if (!period || !PERIOD_RE.test(period)) {
    return !filters.from && !filters.to;
  }
  if (filters.from && period < filters.from) return false;
  if (filters.to && period > filters.to) return false;
  return true;
}

export function matchesWording(
  fields: Array<string | undefined | null>,
  wording: string | undefined,
): boolean {
  const q = wording?.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
}

export function filterByAppFilters<T>(
  items: T[],
  filters: AppFilters,
  getPeriod: (item: T) => string | undefined,
  getTextFields: (item: T) => Array<string | undefined | null>,
): T[] {
  if (!isFilterActive(filters)) return items;
  return items.filter(
    (item) =>
      periodInRange(getPeriod(item), filters) &&
      matchesWording(getTextFields(item), filters.wording),
  );
}
