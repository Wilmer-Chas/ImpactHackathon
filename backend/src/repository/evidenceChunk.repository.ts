import { getDb } from "../db/client.js";
import type { EntityType, EvidenceChunkRecord } from "../db/types.js";
import { parseEmbedding } from "../db/types.js";

type ChunkRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  text: string;
  content_hash: string;
  embedding: string | null;
  updated_at: string;
};

function mapChunkRow(row: ChunkRow): EvidenceChunkRecord {
  return {
    id: row.id,
    entityType: row.entity_type as EntityType,
    entityId: row.entity_id,
    text: row.text,
    contentHash: row.content_hash,
    embedding: parseEmbedding(row.embedding),
    updatedAt: row.updated_at,
  };
}

/** All embedded chunks, optionally restricted to the given entity types. */
export function listEmbeddedChunks(entityTypes?: readonly EntityType[]): EvidenceChunkRecord[] {
  if (!entityTypes || entityTypes.length === 0) {
    const rows = getDb()
      .prepare("SELECT * FROM evidence_chunks WHERE embedding IS NOT NULL")
      .all() as ChunkRow[];
    return rows.map(mapChunkRow);
  }

  const placeholders = entityTypes.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT * FROM evidence_chunks
       WHERE embedding IS NOT NULL AND entity_type IN (${placeholders})`,
    )
    .all(...entityTypes) as ChunkRow[];
  return rows.map(mapChunkRow);
}
