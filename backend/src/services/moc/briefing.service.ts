import type {
  AgendaItem,
  MocBriefing,
} from "../../domain/moc/briefing.js";
import { authorBriefingNarrative } from "../ai/briefingIntelligence.service.js";
import { retrievePortfolioEvidenceForBriefing } from "../evidence/rag.service.js";

export class MocBriefingService {
  async getBriefing(): Promise<MocBriefing> {
    const { pack, riskRegister, agendaChanges } = await retrievePortfolioEvidenceForBriefing();

    const agenda: AgendaItem[] = agendaChanges.map((change) => {
      const risk = riskRegister.find((record) => record.changeType === change.changeType) ?? null;
      return {
        changeId: change.id,
        title: change.title,
        application: change.application,
        changeType: change.changeType,
        residualRisk: risk?.residualRisk ?? null,
        status: change.status,
        agendaStatus: "needs_moc_stance",
      };
    });

    const narrative = await authorBriefingNarrative(pack);

    return {
      meeting: pack.meeting,
      posture: pack.posture,
      narrative,
      agenda,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const mocBriefingService = new MocBriefingService();
