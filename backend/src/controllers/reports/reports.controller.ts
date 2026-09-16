import type { Request, Response } from "express";
import {
  MocIntelligenceValidationError,
} from "../../services/ai/mocIntelligence.service.js";
import {
  OllamaResponseError,
  OllamaUnavailableError,
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
    if (err instanceof OllamaUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof MocIntelligenceValidationError || err instanceof OllamaResponseError) {
      res.status(502).json({ error: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : "Unexpected error generating report";
    res.status(500).json({ error: message });
  }
}
