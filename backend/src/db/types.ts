export type EntityType =
  | "change"
  | "incident"
  | "process_metric"
  | "performance_metric"
  | "risk"
  | "release"
  | "data_quality"
  | "ops_alert"
  | "customer_note";

export type EvidenceChunkRecord = {
  id: string;
  entityType: EntityType;
  entityId: string;
  text: string;
  contentHash: string;
  embedding: number[] | null;
  updatedAt: string;
};

export function chunkId(entityType: EntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding);
}

export function parseEmbedding(raw: string | null): number[] | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((n) => typeof n !== "number")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
