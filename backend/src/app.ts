import cors from "cors";
import express from "express";
import { mocRouter } from "./routes/moc/moc.routes.js";
import { reportsRouter } from "./routes/reports/reports.routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/moc", mocRouter);
  app.use("/api/reports", reportsRouter);

  return app;
}