import { Router } from "express";
import { getTrends } from "../../controllers/ops/trends.controller.js";

export const opsRouter = Router();

opsRouter.get("/trends", getTrends);
