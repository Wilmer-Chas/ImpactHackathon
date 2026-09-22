import { AiResponseError, chatJson } from "./ollama.client.js";

export type RiskClusterSummaryInput = {
  id: string;
  name: string;
  category: string;
  evidenceSample: Array<{ id: string; title: string; sourceType: string }>;
};

const SYSTEM_PROMPT = `You are the risk intelligence engine for Impact (Transaction Monitoring / AML oversight).

Given deterministic risk clusters built from multi-source signals (incidents, data quality, ops alerts), write a short summary for each cluster.

Rules:
- Use ONLY the evidence IDs and titles provided. Never invent IDs, counts, or scores.
- One sentence per cluster description — leadership-ready, specific, no filler.
- Prefer citing 1–2 real evidence IDs in the sentence when helpful.

Output MUST be a single JSON object:
{
  "summaries": {
    "<clusterId>": "one short sentence grounded in provided evidence"
  }
}`;

function fallbackDescription(cluster: RiskClusterSummaryInput): string {
  const sample = cluster.evidenceSample
    .slice(0, 3)
    .map((e) => e.id)
    .join(", ");
  return sample
    ? `${cluster.name}: consolidated from evidence including ${sample}.`
    : `${cluster.name}: consolidated multi-source risk theme.`;
}

export async function summarizeRiskClusters(
  clusters: RiskClusterSummaryInput[],
): Promise<Record<string, string>> {
  const fallback: Record<string, string> = {};
  for (const cluster of clusters) {
    fallback[cluster.id] = fallbackDescription(cluster);
  }

  if (clusters.length === 0) {
    return fallback;
  }

  try {
    const raw = await chatJson([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          clusters: clusters.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            evidenceSample: c.evidenceSample.slice(0, 8),
          })),
        }),
      },
    ]);

    const parsed = JSON.parse(raw) as { summaries?: Record<string, unknown> };
    if (!parsed.summaries || typeof parsed.summaries !== "object") {
      return fallback;
    }

    const out: Record<string, string> = { ...fallback };
    for (const cluster of clusters) {
      const value = parsed.summaries[cluster.id];
      if (typeof value === "string" && value.trim()) {
        out[cluster.id] = value.trim();
      }
    }
    return out;
  } catch (err) {
    if (err instanceof AiResponseError || err instanceof SyntaxError) {
      return fallback;
    }
    return fallback;
  }
}
