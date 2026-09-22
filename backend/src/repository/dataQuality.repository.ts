import type { DataQualityIssue } from "../domain/index.js";
import { getDb } from "../db/client.js";

type DataQualityRow = {
  source: string;
  field: string;
  missing_rate: number;
  severity: string;
  notes: string;
  theme: string | null;
  tags_json: string | null;
  category: string | null;
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function mapDataQuality(row: DataQualityRow): DataQualityIssue {
  return {
    source: row.source,
    field: row.field,
    missingRate: row.missing_rate,
    severity: row.severity as DataQualityIssue["severity"],
    notes: row.notes,
    theme: row.theme,
    tags: parseTags(row.tags_json),
    category: row.category,
  };
}

export function listAllDataQuality(): DataQualityIssue[] {
  const rows = getDb().prepare("SELECT * FROM data_quality").all() as DataQualityRow[];
  return rows.map(mapDataQuality);
}

export function getDataQualityByEntityId(entityId: string): DataQualityIssue | null {
  const [source, field] = entityId.split("|");
  if (!source || !field) {
    return null;
  }
  const row = getDb()
    .prepare("SELECT * FROM data_quality WHERE source = ? AND field = ?")
    .get(source, field) as DataQualityRow | undefined;
  return row ? mapDataQuality(row) : null;
}
