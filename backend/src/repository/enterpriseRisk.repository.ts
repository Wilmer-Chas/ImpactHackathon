import type { EnterpriseRiskItem, EnterpriseRiskLevel } from "../domain/ops/riskAnalysis.js";
import { getDb } from "../db/client.js";

type EnterpriseRiskRow = {
  id: string;
  name: string;
  category: string;
  likelihood: string;
  impact: string;
  owner: string;
  description: string;
};

function mapRow(row: EnterpriseRiskRow): EnterpriseRiskItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    likelihood: row.likelihood as EnterpriseRiskLevel,
    impact: row.impact as EnterpriseRiskLevel,
    owner: row.owner,
    description: row.description,
    evidenceCount: 0,
    evidenceRefs: [],
    sourceTypes: [],
  };
}

export function listEnterpriseRisks(): EnterpriseRiskItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, name, category, likelihood, impact, owner, description
       FROM enterprise_risks
       ORDER BY category, id`,
    )
    .all() as EnterpriseRiskRow[];
  return rows.map(mapRow);
}
