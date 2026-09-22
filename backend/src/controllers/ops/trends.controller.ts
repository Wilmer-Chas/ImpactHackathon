import type { Request, Response } from "express";
import { trendsService } from "../../services/ops/trends.service.js";

export function getTrends(_req: Request, res: Response): void {
  res.json(trendsService.getTrends());
}
