import { Router } from "express";
import { getMocBriefing } from "../../controllers/moc/moc.controller.js";

export const mocRouter = Router();

mocRouter.get("/briefing", getMocBriefing);
