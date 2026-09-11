import { Router } from "express";
import { getReportByChangeId } from "../controllers/reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get("/:changeId", getReportByChangeId);