import cors from "cors";
import express from "express";
import { mocRouter } from "./routes/moc/moc.routes.js";
import { reportsRouter } from "./routes/reports/reports.routes.js";
import { chatRouter } from "./routes/chat/chat.routes.js";
import { opsRouter } from "./routes/ops/ops.routes.js";
import { schedulesRouter } from "./routes/schedules/schedules.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/moc", mocRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/ops", opsRouter);
  app.use("/api/schedules", schedulesRouter);

  return app;
}
