import type { Request, Response } from "express";
import { adminService } from "../../services/admin/admin.service.js";

const ACTIONS = new Set(["approve", "redact", "reject"]);

export function getAdminOverview(_req: Request, res: Response): void {
  res.json(adminService.getOverview());
}

export function postPiiFlagAction(req: Request, res: Response): void {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  const action = req.body?.action as string | undefined;
  if (!action || !ACTIONS.has(action)) {
    res.status(400).json({ error: "action must be approve, redact, or reject" });
    return;
  }
  const flag = adminService.applyFlagAction(
    id,
    action as "approve" | "redact" | "reject",
  );
  if (!flag) {
    res.status(404).json({ error: `Flag ${id} not found` });
    return;
  }
  res.json(flag);
}
