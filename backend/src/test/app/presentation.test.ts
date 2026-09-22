import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";
import { getDb } from "../../db/client.js";

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
    chatJson: vi.fn(async (messages: Array<{ role: string; content: string }>) => {
      const system = messages[0]?.content ?? "";
      if (system.includes("General Assistant")) {
        return JSON.stringify({
          reply: "Grounded reply citing INC-4402.",
          filterAction: null,
        });
      }
      if (system.includes("risk intelligence engine")) {
        return JSON.stringify({
          summaries: {
            "RSK-phishing-payments":
              "Elevated phishing attempts (INC-9001) targeting payments staff remain critical.",
            "RSK-vendor-sla":
              "Vendor SLA pressure continues with ALT-9100 and case-system completeness gaps.",
          },
        });
      }
      return JSON.stringify({
        bullets: ["Performance dropped in August.", "Incident INC-4402 is open."],
        momSummary: "Since July: +3 new risks · 2 resolved",
        auditId: "RUN-202608-014",
      });
    }),
  };
});

function seedPresentationTables() {
  const db = openTempDb();
  seedMinimalEvidence();

  db.prepare(
    `INSERT INTO pipeline_runs (month_label, month_key, runs, flags) VALUES (?, ?, ?, ?)`,
  ).run("Aug", "2026-08", 24, 3);
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

  db.prepare(
    `INSERT INTO incidents (
       id, application, title, severity, status, root_cause, opened_at, resolved_at,
       theme, tags_json, category
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "INC-9001",
    "TM-Core",
    "Phishing click on payment approver mailbox",
    "high",
    "open",
    null,
    "2026-09-01",
    null,
    "phishing-payments",
    JSON.stringify(["phishing-payments", "high-risk"]),
    "Cyber",
  );
  db.prepare(
    `INSERT INTO incidents (
       id, application, title, severity, status, root_cause, opened_at, resolved_at,
       theme, tags_json, category
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "INC-9002",
    "Payments-Portal",
    "Credential harvest attempt on treasury staff",
    "high",
    "open",
    "Under investigation",
    "2026-09-02",
    null,
    "phishing-payments",
    JSON.stringify(["phishing-payments", "high-risk"]),
    "Cyber",
  );
  db.prepare(
    `INSERT INTO ops_alerts (
       id, application, title, severity, status, theme, tags_json, category,
       opened_at, source_system
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "ALT-9001",
    "TM-Core",
    "Email gateway: high-risk phish score",
    "high",
    "open",
    "phishing-payments",
    JSON.stringify(["phishing-payments", "high-risk"]),
    "Cyber",
    "2026-09-04",
    "Splunk",
  );
  db.prepare(
    `INSERT INTO ops_alerts (
       id, application, title, severity, status, theme, tags_json, category,
       opened_at, source_system
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "ALT-9100",
    "Fraud-Gateway",
    "Vendor status: degraded API",
    "medium",
    "open",
    "vendor-sla",
    JSON.stringify(["vendor-sla", "high-risk"]),
    "Operational",
    "2026-09-05",
    "Datadog",
  );
  db.prepare(
    `INSERT INTO data_quality (
       source, field, missing_rate, severity, notes, theme, tags_json, category
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "case-system",
    "sla_met",
    0.18,
    "medium",
    "Vendor case sync completeness gaps",
    "vendor-sla",
    JSON.stringify(["vendor-sla"]),
    "Operational",
  );

  return db;
}

describe("new presentation APIs", () => {
  it("lists trends with performance anomalies", async () => {
    seedPresentationTables();
    const app = createApp();
    const res = await request(app).get("/api/ops/trends");
    expect(res.status).toBe(200);
    expect(res.body.anomalyCount).toBeGreaterThan(0);
  });

  it("supports schedule CRUD", async () => {
    seedPresentationTables();
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
    seedPresentationTables();
    const app = createApp();
    const res = await request(app).post("/api/chat").send({ message: "What about INC-4402?" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("INC-4402");
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.filterAction).toBeUndefined();

    const sessions = await request(app).get("/api/chat/sessions");
    expect(sessions.body.some((s: { id: string }) => s.id === res.body.sessionId)).toBe(true);

    const session = await request(app).get(`/api/chat/sessions/${res.body.sessionId}`);
    expect(session.body.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("surfaces filterAction from structured chat replies", async () => {
    const { chatJson } = await import("../../services/ai/ollama.client.js");
    vi.mocked(chatJson).mockImplementationOnce(async () =>
      JSON.stringify({
        reply: "Showing phishing-related items for Q3 2026.",
        filterAction: {
          type: "set_filters",
          filters: { from: "2026-07", to: "2026-09", wording: "phishing" },
        },
      }),
    );

    seedPresentationTables();
    const app = createApp();
    const res = await request(app)
      .post("/api/chat")
      .send({ message: "Filter to phishing in Q3 2026" });

    expect(res.status).toBe(200);
    expect(res.body.filterAction).toEqual({
      type: "set_filters",
      filters: { from: "2026-07", to: "2026-09", wording: "phishing" },
    });
  });

  it("generates and fetches a monthly report", async () => {
    seedPresentationTables();
    const app = createApp();
    const created = await request(app).post("/api/reports/monthly").send({ period: "2026-08" });
    expect(created.status).toBe(201);
    expect(created.body.period).toBe("2026-08");
    expect(created.body.narrative.bullets.length).toBeGreaterThan(0);

    const fetched = await request(app).get("/api/reports/monthly/2026-08");
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toContain("Fraud Detection");
  });

  it("returns enterprise risk analysis for a timeframe", async () => {
    seedPresentationTables();
    const app = createApp();
    const res = await request(app)
      .post("/api/reports/risk")
      .send({ from: "2026-06-01", to: "2026-09-30" });
    expect(res.status).toBe(201);
    expect(res.body.period).toEqual({ from: "2026-06-01", to: "2026-09-30" });
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.itemsByCategory.Cyber[0].id).toBe("RSK-phishing-payments");
    expect(res.body.itemsByCategory.Cyber[0].evidenceCount).toBeGreaterThan(1);
    expect(res.body.summaryBullets.some((b: string) => b.includes("Targeted Phishing"))).toBe(
      true,
    );
  });

  it("excludes incidents resolved by the end of a longer timeframe", async () => {
    seedPresentationTables();
    const db = getDb();
    db.prepare(
      `INSERT INTO incidents (
         id, application, title, severity, status, root_cause, opened_at, resolved_at,
         theme, tags_json, category
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "INC-9013",
      "TM-Core",
      "Batch scoring stalled overnight",
      "high",
      "resolved",
      "Fixed",
      "2026-09-08",
      "2026-09-13",
      "model-latency",
      JSON.stringify(["model-latency", "high-risk"]),
      "Operational",
    );

    const app = createApp();
    const short = await request(app)
      .post("/api/reports/risk")
      .send({ from: "2026-09-08", to: "2026-09-11" });
    expect(short.status).toBe(201);
    expect(short.body.itemsByCategory.Operational?.some((r: { id: string }) => r.id === "RSK-model-latency")).toBe(
      true,
    );

    const longer = await request(app)
      .post("/api/reports/risk")
      .send({ from: "2026-09-08", to: "2026-09-16" });
    expect(longer.status).toBe(201);
    expect(
      longer.body.itemsByCategory.Operational?.some((r: { id: string }) => r.id === "RSK-model-latency"),
    ).toBeFalsy();
  });

  it("returns 404 when no themed signals are seeded", async () => {
    openTempDb();
    seedMinimalEvidence();
    const app = createApp();
    const res = await request(app).post("/api/reports/risk").send({
      from: "2026-06-01",
      to: "2026-09-30",
    });
    expect(res.status).toBe(404);
  });
});
