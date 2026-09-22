import type { Request, Response } from "express";
import {
  MocIntelligenceValidationError,
} from "../../services/ai/mocIntelligence.service.js";
import {
  AiResponseError,
  AiUnavailableError,
} from "../../services/ai/ollama.client.js";
import { mocReportService } from "../../services/reports/mocReport.service.js";
import {
  monthlyReportService,
  MonthlyReportValidationError,
} from "../../services/reports/monthlyReport.service.js";
import {
  RiskPeriodValidationError,
  riskAnalysisService,
} from "../../services/reports/riskAnalysis.service.js";

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

export async function getMonthlyReport(req: Request, res: Response): Promise<void> {
  const period = req.params.period;
  if (!period) {
    res.status(400).json({ error: "period is required" });
    return;
  }
  const report = monthlyReportService.getByPeriod(period);
  if (!report) {
    res.status(404).json({ error: `No monthly report for ${period}` });
    return;
  }
  res.json(report);
}

export async function getLatestMonthlyReport(_req: Request, res: Response): Promise<void> {
  const report = monthlyReportService.getLatest();
  if (!report) {
    res.status(404).json({ error: "No monthly reports generated yet" });
    return;
  }
  res.json(report);
}

export async function getRiskAnalysisReport(req: Request, res: Response): Promise<void> {
  try {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const report = await riskAnalysisService.getReport(from, to);
    if (!report) {
      res.status(404).json({
        error: "No risks found for this timeframe (nothing still open at period end)",
      });
      return;
    }
    res.json(report);
  } catch (err: unknown) {
    if (err instanceof RiskPeriodValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Unexpected error loading risk analysis";
    res.status(500).json({ error: message });
  }
}

export async function postRiskAnalysisReport(req: Request, res: Response): Promise<void> {
  try {
    const from = typeof req.body?.from === "string" ? req.body.from : undefined;
    const to = typeof req.body?.to === "string" ? req.body.to : undefined;
    const report = await riskAnalysisService.generateReport(from, to);
    if (!report) {
      res.status(404).json({
        error: "No risks found for this timeframe (nothing still open at period end)",
      });
      return;
    }
    res.status(201).json(report);
  } catch (err: unknown) {
    if (err instanceof RiskPeriodValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof AiUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof AiResponseError) {
      res.status(502).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Unexpected error generating risk analysis";
    res.status(500).json({ error: message });
  }
}

export async function postMonthlyReport(req: Request, res: Response): Promise<void> {
  const period = typeof req.body?.period === "string" ? req.body.period : undefined;
  try {
    const report = await monthlyReportService.generate(period);
    res.status(201).json(report);
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof MonthlyReportValidationError || err instanceof AiResponseError) {
      res.status(502).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : "Unexpected error generating monthly report";
    res.status(500).json({ error: message });
  }
}
