import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isFilterActive, normalizeFilters } from "../lib/applyFilters";
import type { AppFilters } from "../types/filters";

const STORAGE_KEY = "impact.appFilters";

type AppFilterContextValue = {
  filters: AppFilters;
  setFilters: (filters: AppFilters) => void;
  patchFilters: (partial: AppFilters) => void;
  clearFilters: () => void;
  isActive: boolean;
};

const AppFilterContext = createContext<AppFilterContextValue | null>(null);

function readStoredFilters(): AppFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return normalizeFilters(parsed as AppFilters);
  } catch {
    return {};
  }
}

export function AppFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<AppFilters>(() => readStoredFilters());

  useEffect(() => {
    if (!isFilterActive(filters)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const setFilters = useCallback((next: AppFilters) => {
    setFiltersState(normalizeFilters(next));
  }, []);

  const patchFilters = useCallback((partial: AppFilters) => {
    setFiltersState((prev) => normalizeFilters({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      patchFilters,
      clearFilters,
      isActive: isFilterActive(filters),
    }),
    [filters, setFilters, patchFilters, clearFilters],
  );

  return <AppFilterContext.Provider value={value}>{children}</AppFilterContext.Provider>;
}

export function useAppFilters(): AppFilterContextValue {
  const ctx = useContext(AppFilterContext);
  if (!ctx) {
    throw new Error("useAppFilters must be used within AppFilterProvider");
  }
  return ctx;
}
