import type { MocBriefing, MocReport } from "../../types/moc";
import { apiGet } from "./http";

export function fetchMocBriefing(): Promise<MocBriefing> {
  return apiGet("/api/moc/briefing");
}

export function fetchDecisionBrief(changeId: string): Promise<MocReport> {
  return apiGet(`/api/reports/${changeId}`);
}
