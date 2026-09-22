import { Router } from "express";
import {
  createSchedule,
  deleteSchedule,
  listSchedules,
  patchSchedule,
} from "../../controllers/ops/schedules.controller.js";

export const schedulesRouter = Router();

schedulesRouter.get("/", listSchedules);
schedulesRouter.post("/", createSchedule);
schedulesRouter.patch("/:id", patchSchedule);
schedulesRouter.delete("/:id", deleteSchedule);
