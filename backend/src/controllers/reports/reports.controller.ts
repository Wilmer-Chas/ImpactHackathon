import type { Request, Response } from "express";
import {
  MocIntelligenceValidationError,
} from "../../services/ai/mocIntelligence.service.js";
import {
  AiResponseError,
  AiUnavailableError,
} from "../../services/ai/ollama.client.js";
import { mocReportService } from "../../services/reports/mocReport.service.js";

export async function getReportByChangeId(req: Request, res: Response): Promise<void> {
  const changeId = req.params.changeId;
  if (!changeId) {
    res.status(400).json({ error: "changeId is required" });
    return;
  }

  try {
    const report = await mocReportService.getByChangeId(changeId);
    if (!report) {
      res.status(404).json({ error: `No decision brief for change ${changeId}` });
      return;
    }

    res.json(report);
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof MocIntelligenceValidationError || err instanceof AiResponseError) {
      res.status(502).json({ error: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : "Unexpected error generating report";
    res.status(500).json({ error: message });
  }
}
