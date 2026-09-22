import type { Request, Response } from "express";
import { MocIntelligenceValidationError } from "../../services/ai/mocIntelligence.service.js";
import {
  AiResponseError,
  AiUnavailableError,
} from "../../services/ai/ollama.client.js";
import { mocBriefingService } from "../../services/moc/briefing.service.js";

export async function getMocBriefing(_req: Request, res: Response): Promise<void> {
  try {
    const briefing = await mocBriefingService.getBriefing();
    res.json(briefing);
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof MocIntelligenceValidationError || err instanceof AiResponseError) {
      res.status(502).json({ error: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : "Unexpected error loading MOC briefing";
    res.status(500).json({ error: message });
  }
}
