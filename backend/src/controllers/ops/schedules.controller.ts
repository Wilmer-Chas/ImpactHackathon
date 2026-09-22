import type { Request, Response } from "express";
import { scheduleService } from "../../services/ops/schedule.service.js";

export function listSchedules(_req: Request, res: Response): void {
  res.json(scheduleService.list());
}

export function createSchedule(req: Request, res: Response): void {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const cadence = typeof req.body?.cadence === "string" ? req.body.cadence.trim() : "";
  const nextRun = typeof req.body?.nextRun === "string" ? req.body.nextRun.trim() : "";
  if (!name || !cadence || !nextRun) {
    res.status(400).json({ error: "name, cadence, and nextRun are required" });
    return;
  }
  const enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : true;
  res.status(201).json(scheduleService.create({ name, cadence, nextRun, enabled }));
}

export function patchSchedule(req: Request, res: Response): void {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  const patch: {
    name?: string;
    cadence?: string;
    nextRun?: string;
    enabled?: boolean;
  } = {};
  if (typeof req.body?.name === "string") patch.name = req.body.name.trim();
  if (typeof req.body?.cadence === "string") patch.cadence = req.body.cadence.trim();
  if (typeof req.body?.nextRun === "string") patch.nextRun = req.body.nextRun.trim();
  if (typeof req.body?.enabled === "boolean") patch.enabled = req.body.enabled;

  const updated = scheduleService.update(id, patch);
  if (!updated) {
    res.status(404).json({ error: `Schedule ${id} not found` });
    return;
  }
  res.json(updated);
}

export function deleteSchedule(req: Request, res: Response): void {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  if (!scheduleService.remove(id)) {
    res.status(404).json({ error: `Schedule ${id} not found` });
    return;
  }
  res.status(204).send();
}
