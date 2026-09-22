import type { MonthlyReport, RiskAnalysisReport, TrendsResponse } from "../../types/ops";
import { apiGet, apiSend } from "./http";

export function fetchLatestMonthlyReport(): Promise<MonthlyReport> {
  return apiGet("/api/reports/monthly/latest");
}

export function fetchMonthlyReport(period: string): Promise<MonthlyReport> {
  return apiGet(`/api/reports/monthly/${period}`);
}

export function generateMonthlyReport(period?: string): Promise<MonthlyReport> {
  return apiSend<MonthlyReport>(
    "/api/reports/monthly",
    "POST",
    period ? { period } : {},
  ) as Promise<MonthlyReport>;
}

export function fetchRiskAnalysisReport(from?: string, to?: string): Promise<RiskAnalysisReport> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return apiGet(`/api/reports/risk${qs ? `?${qs}` : ""}`);
}

export function generateRiskAnalysisReport(
  from?: string,
  to?: string,
): Promise<RiskAnalysisReport> {
  return apiSend<RiskAnalysisReport>("/api/reports/risk", "POST", {
    from,
    to,
  }) as Promise<RiskAnalysisReport>;
}

export function fetchTrends(): Promise<TrendsResponse> {
  return apiGet("/api/ops/trends");
}
