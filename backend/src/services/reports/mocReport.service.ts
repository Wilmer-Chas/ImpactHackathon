import type { MocReport } from "../../domain/index.js";
import { concludeFromEvidence } from "../ai/mocIntelligence.service.js";
import { getChangeById } from "../../repository/index.js";
import { retrieveEvidencePackForChange } from "../evidence/rag.service.js";

export class MocReportService {
  async getByChangeId(changeId: string): Promise<MocReport | null> {
    const change = getChangeById(changeId);
    if (!change) {
      return null;
    }

    const evidence = await retrieveEvidencePackForChange(change);
    const conclusion = await concludeFromEvidence(change, evidence);

    return {
      change,
      recommendation: conclusion.recommendation,
      rationale: conclusion.rationale,
      findings: conclusion.findings,
      evidence,
      caveats: conclusion.caveats,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mocReportService = new MocReportService();
