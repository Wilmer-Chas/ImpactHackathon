import { Router } from "express";
import {
  getAdminOverview,
  postPiiFlagAction,
} from "../../controllers/admin/admin.controller.js";

export const adminRouter = Router();

adminRouter.get("/overview", getAdminOverview);
adminRouter.post("/flags/:id/action", postPiiFlagAction);
