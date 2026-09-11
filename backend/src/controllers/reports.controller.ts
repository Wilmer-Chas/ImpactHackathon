import type { Request, Response } from "express";
import { mocReportService } from "../services/mocReport.service.js";

export function getReportByChangeId(req: Request, res: Response): void {
  const changeId = req.params.changeId;
  if (!changeId) {
    res.status(400).json({ error: "changeId is required" });
    return;
  }

  const report = mocReportService.getByChangeId(changeId);
  if (!report) {
    res.status(404).json({ error: `No MOC report for change ${changeId}` });
    return;
  }

  res.json(report);
}