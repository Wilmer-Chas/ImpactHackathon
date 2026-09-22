import type { ChangeType, ResidualRisk, RiskRecord } from "../domain/index.js";
import { getDb } from "../db/client.js";

type RiskRow = {
  change_type: string;
  category: string;
  likelihood: number;
  impact: number;
  residual_risk: string;
  notes: string;
};

function mapRisk(row: RiskRow): RiskRecord {
  return {
    changeType: row.change_type as ChangeType,
    category: row.category,
    likelihood: row.likelihood,
    impact: row.impact,
    residualRisk: row.residual_risk as ResidualRisk,
    notes: row.notes,
  };
}

export function listAllRiskRecords(): RiskRecord[] {
  const rows = getDb().prepare("SELECT * FROM risk_register").all() as RiskRow[];
  return rows.map(mapRisk);
}

export function getRiskByChangeType(changeType: string): RiskRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM risk_register WHERE change_type = ?")
    .get(changeType) as RiskRow | undefined;
  return row ? mapRisk(row) : null;
}
