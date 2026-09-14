import { Router } from "express";
import { getReportByChangeId } from "../../controllers/reports/reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get("/:changeId", getReportByChangeId);
