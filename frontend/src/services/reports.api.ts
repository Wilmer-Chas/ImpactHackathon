import type { MocReport } from "../types/mocReport";

export async function fetchMocReport(changeId: string): Promise<MocReport> {
  const response = await fetch(`/api/reports/${changeId}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load report (${response.status})`);
  }
  return response.json() as Promise<MocReport>;
}