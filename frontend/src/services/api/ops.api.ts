import type { MonthlyReport, ReportSchedule, TrendsResponse } from "../../types/ops";
import { apiGet, apiSend } from "./http";

export function fetchLatestMonthlyReport(): Promise<MonthlyReport> {
  return apiGet("/api/reports/monthly/latest");
}

export function fetchMonthlyReport(period: string): Promise<MonthlyReport> {
  return apiGet(`/api/reports/monthly/${period}`);
}

export function generateMonthlyReport(period?: string): Promise<MonthlyReport> {
  return apiSend<MonthlyReport>("/api/reports/monthly", "POST", period ? { period } : {}) as Promise<MonthlyReport>;
}

export function fetchTrends(): Promise<TrendsResponse> {
  return apiGet("/api/ops/trends");
}

export function listSchedules(): Promise<ReportSchedule[]> {
  return apiGet("/api/schedules");
}

export function patchSchedule(
  id: string,
  patch: Partial<Pick<ReportSchedule, "name" | "cadence" | "nextRun" | "enabled">>,
): Promise<ReportSchedule> {
  return apiSend<ReportSchedule>(`/api/schedules/${id}`, "PATCH", patch) as Promise<ReportSchedule>;
}

export function createSchedule(input: {
  name: string;
  cadence: string;
  nextRun: string;
  enabled?: boolean;
}): Promise<ReportSchedule> {
  return apiSend<ReportSchedule>("/api/schedules", "POST", input) as Promise<ReportSchedule>;
}

export function deleteSchedule(id: string): Promise<void> {
  return apiSend<void>(`/api/schedules/${id}`, "DELETE") as Promise<void>;
}
