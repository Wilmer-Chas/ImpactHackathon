import type { MocBriefing } from "../../types/moc/briefing";

export async function fetchMocBriefing(): Promise<MocBriefing> {
  const response = await fetch("/api/moc/briefing");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to load MOC briefing (${response.status})`);
  }
  return response.json() as Promise<MocBriefing>;
}
