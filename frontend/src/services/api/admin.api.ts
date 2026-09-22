import type { AdminOverview, PiiFlag, PiiFlagAction } from "../../types/admin";
import { apiGet, apiSend } from "./http";

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiGet("/api/admin/overview");
}

export function applyPiiFlagAction(id: string, action: PiiFlagAction): Promise<PiiFlag> {
  return apiSend<PiiFlag>(`/api/admin/flags/${id}/action`, "POST", { action }) as Promise<PiiFlag>;
}
