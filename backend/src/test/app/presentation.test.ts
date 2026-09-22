import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";

vi.mock("../../services/ai/embeddings.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/ai/embeddings.client.js")>();
  return {
    ...actual,
    embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
  };
});

vi.mock("../../services/ai/ollama.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/ai/ollama.client.js")>();
  return {
    ...actual,
    chat: vi.fn(async () => "Grounded reply citing INC-4402."),
    chatJson: vi.fn(async () =>
      JSON.stringify({
        bullets: ["Performance dropped in August.", "Incident INC-4402 is open."],
        momSummary: "Since July: +3 new risks · 2 resolved",
        auditId: "RUN-202608-014",
      }),
    ),
  };
});

function seedAdminTables() {
  const db = openTempDb();
  seedMinimalEvidence();

  db.prepare(
    `INSERT INTO pipeline_runs (month_label, month_key, runs, flags) VALUES (?, ?, ?, ?)`,
  ).run("Aug", "2026-08", 24, 3);
  db.prepare(
    `INSERT INTO ai_models (id, name, share_percent, enabled, sort_order) VALUES (?, ?, ?, ?, ?)`,
  ).run("m1", "Claude Sonnet 5", 62, 1, 1);
  db.prepare(
    `INSERT INTO pii_flags (id, description, score, factors_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "INC-0009",
    "Case [name masked]",
    68,
    JSON.stringify(["name"]),
    "pending",
    "2026-08-28T10:00:00.000Z",
  );
  db.prepare(`INSERT INTO admin_meta (key, value) VALUES (?, ?)`).run("scanned", "1204");
  db.prepare(`INSERT INTO admin_meta (key, value) VALUES (?, ?)`).run("activeUsers", "18");
  db.prepare(
    `INSERT INTO performance_series (period, month_label, value, target, is_anomaly)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("2026-08", "Aug", 65, 90, 1);
  db.prepare(
    `INSERT INTO risk_snapshots (id, risk_id, period, summary, state) VALUES (?, ?, ?, ?, ?)`,
  ).run("2026-08:RSK-0015", "RSK-0015", "2026-08", "Elevated phishing", "new");
  db.prepare(
    `INSERT INTO report_schedules (id, name, cadence, next_run, enabled) VALUES (?, ?, ?, ?, ?)`,
  ).run("sched-1", "Fraud Monthly", "monthly", "2026-09-01", 1);

  return db;
}

describe("new presentation APIs", () => {
  it("returns admin overview from seeded tables", async () => {
    seedAdminTables();
    const app = createApp();
    const res = await request(app).get("/api/admin/overview");
    expect(res.status).toBe(200);
    expect(res.body.kpis.runs).toBe(24);
    expect(res.body.kpis.flagged).toBe(1);
    expect(res.body.models).toHaveLength(1);
    expect(res.body.flagged[0].id).toBe("INC-0009");
  });

  it("applies PII flag actions", async () => {
    seedAdminTables();
    const app = createApp();
    const res = await request(app)
      .post("/api/admin/flags/INC-0009/action")
      .send({ action: "approve" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");

    const overview = await request(app).get("/api/admin/overview");
    expect(overview.body.kpis.flagged).toBe(0);
  });

  it("lists trends with performance anomalies", async () => {
    seedAdminTables();
    const app = createApp();
    const res = await request(app).get("/api/ops/trends");
    expect(res.status).toBe(200);
    expect(res.body.anomalyCount).toBeGreaterThan(0);
  });

  it("supports schedule CRUD", async () => {
    seedAdminTables();
    const app = createApp();
    const list = await request(app).get("/api/schedules");
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);

    const created = await request(app)
      .post("/api/schedules")
      .send({ name: "Extra", cadence: "weekly", nextRun: "2026-09-10", enabled: true });
    expect(created.status).toBe(201);

    const patched = await request(app)
      .patch(`/api/schedules/${created.body.id}`)
      .send({ enabled: false });
    expect(patched.status).toBe(200);
    expect(patched.body.enabled).toBe(false);

    const deleted = await request(app).delete(`/api/schedules/${created.body.id}`);
    expect(deleted.status).toBe(204);
  });

  it("posts chat and persists session history", async () => {
    seedAdminTables();
    const app = createApp();
    const res = await request(app).post("/api/chat").send({ message: "What about INC-4402?" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("INC-4402");
    expect(res.body.sessionId).toBeTruthy();

    const sessions = await request(app).get("/api/chat/sessions");
    expect(sessions.body.some((s: { id: string }) => s.id === res.body.sessionId)).toBe(true);

    const session = await request(app).get(`/api/chat/sessions/${res.body.sessionId}`);
    expect(session.body.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("generates and fetches a monthly report", async () => {
    seedAdminTables();
    const app = createApp();
    const created = await request(app).post("/api/reports/monthly").send({ period: "2026-08" });
    expect(created.status).toBe(201);
    expect(created.body.period).toBe("2026-08");
    expect(created.body.narrative.bullets.length).toBeGreaterThan(0);

    const fetched = await request(app).get("/api/reports/monthly/2026-08");
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toContain("Fraud Detection");
  });
});
