import { Router } from "express";
import {
  getLatestMonthlyReport,
  getMonthlyReport,
  getReportByChangeId,
  postMonthlyReport,
} from "../../controllers/reports/reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get("/monthly/latest", getLatestMonthlyReport);
reportsRouter.get("/monthly/:period", getMonthlyReport);
reportsRouter.post("/monthly", postMonthlyReport);
reportsRouter.get("/:changeId", getReportByChangeId);
