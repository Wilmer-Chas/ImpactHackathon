import { beforeEach, describe, expect, it, vi } from "vitest";
import { openTempDb } from "../helpers/testDb.js";
import { getDb } from "../../db/client.js";
import {
  clusterSignalsByTheme,
  collectRiskSignals,
  inferCustomerNoteSignals,
  isOpenAtPeriodEnd,
  listUnifiedRisks,
} from "../../services/risk/riskIntelligence.service.js";
import type { CustomerNote, RiskSignal } from "../../domain/index.js";

vi.mock("../../services/ai/ollama.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/ai/ollama.client.js")>();
  return {
    ...actual,
    chatJson: vi.fn(async () =>
      JSON.stringify({
        summaries: {
          "RSK-phishing-payments": "Phishing pressure on payments staff remains elevated (INC-9001).",
          "RSK-data-completeness": "Data gaps in wire fields need remediation (wire-feed|country).",
        },
      }),
    ),
  };
});

const FULL_RANGE = { from: "2026-06-01", to: "2026-09-30" };

function seedSignals() {
  const db = getDb();

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
    `INSERT INTO incidents (
       id, application, title, severity, status, root_cause, opened_at, resolved_at,
       theme, tags_json, category
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "INC-9100",
    "TM-Core",
    "Missing beneficiary country on wires",
    "medium",
    "open",
    null,
    "2026-09-03",
    null,
    "data-completeness",
    JSON.stringify(["data-completeness"]),
    "Regulatory",
  );
  // Opened Sep 8, resolved Sep 13 — period-end sensitive
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
    "Queue drained",
    "2026-09-08",
    "2026-09-13",
    "model-latency",
    JSON.stringify(["model-latency", "high-risk"]),
    "Operational",
  );

  db.prepare(
    `INSERT INTO data_quality (
       source, field, missing_rate, severity, notes, theme, tags_json, category
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "wire-feed",
    "country",
    0.22,
    "medium",
    "Beneficiary country often blank",
    "data-completeness",
    JSON.stringify(["data-completeness"]),
    "Regulatory",
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
    "ALT-9002",
    "TM-Core",
    "SIEM: suspicious login from payment cohort",
    "high",
    "open",
    "phishing-payments",
    JSON.stringify(["phishing-payments", "high-risk"]),
    "Cyber",
    "2026-09-05",
    "CrowdStrike",
  );
}

describe("riskIntelligence", () => {
  beforeEach(() => {
    openTempDb();
    seedSignals();
  });

  it("treats resolution relative to period end", () => {
    expect(isOpenAtPeriodEnd("2026-09-08", "2026-09-13", "2026-09-11")).toBe(true);
    expect(isOpenAtPeriodEnd("2026-09-08", "2026-09-13", "2026-09-16")).toBe(false);
    expect(isOpenAtPeriodEnd("2026-09-08", null, "2026-09-11")).toBe(true);
  });

  it("flags incident resolved after short window but not after longer window", () => {
    const shortWindow = collectRiskSignals({ from: "2026-09-08", to: "2026-09-11" });
    expect(shortWindow.some((s) => s.id === "INC-9013")).toBe(true);

    const longWindow = collectRiskSignals({ from: "2026-09-08", to: "2026-09-16" });
    expect(longWindow.some((s) => s.id === "INC-9013")).toBe(false);
  });

  it("normalizes multi-source signals and clusters by theme", () => {
    const signals = collectRiskSignals(FULL_RANGE);
    expect(signals.some((s) => s.sourceType === "data_quality")).toBe(false);
    expect(signals.length).toBeGreaterThanOrEqual(5);

    const clusters = clusterSignalsByTheme(signals);
    const phishing = clusters.find((c) => c.theme === "phishing-payments");
    expect(phishing?.signals.length).toBeGreaterThanOrEqual(4);
  });

  it("ranks high-risk themes first and attaches evidence refs", async () => {
    const risks = await listUnifiedRisks(FULL_RANGE);
    expect(risks.length).toBeGreaterThanOrEqual(2);
    expect(risks[0]?.id).toBe("RSK-phishing-payments");
    expect(risks[0]?.evidenceRefs).toEqual(
      expect.arrayContaining(["INC-9001", "INC-9002", "ALT-9001", "ALT-9002"]),
    );
    expect(risks[0]?.sourceTypes.sort()).toEqual(["incident", "ops_alert"]);
    expect(risks[0]?.likelihood).toBe("High");
  });

  it("falls back to template summaries when LLM output is unusable", async () => {
    const { chatJson } = await import("../../services/ai/ollama.client.js");
    vi.mocked(chatJson).mockResolvedValueOnce(JSON.stringify({ summaries: {} }));

    const risks = await listUnifiedRisks(FULL_RANGE);
    expect(risks[0]?.description).toContain("INC-9001");
  });

  it("infers unstructured customer notes onto flagged themes without inventing risk tags", () => {
    const structured: RiskSignal[] = collectRiskSignals(FULL_RANGE).filter(
      (s) => s.sourceType !== "customer_note",
    );

    const notes: CustomerNote[] = [
      {
        id: "CUST-0001",
        customerId: "CUS-1000",
        channel: "email",
        recordedAt: "2026-09-01",
        author: "Support L1",
        body: "Customer got a phishing email asking them to re-approve a payment wire from their mailbox.",
      },
      {
        id: "CUST-0002",
        customerId: "CUS-1001",
        channel: "call",
        recordedAt: "2026-09-02",
        author: null,
        body: "Spoofed invoice email targeting payment authorization staff again.",
      },
      {
        id: "CUST-0003",
        customerId: "CUS-1002",
        channel: "chat",
        recordedAt: "2026-09-03",
        author: "RM Desk",
        body: "Another phishing lure about payment limits — this keeps happening.",
      },
      {
        id: "CUST-0047",
        customerId: "CUS-1018",
        channel: "call",
        recordedAt: "2026-09-04",
        author: "Onboarding",
        body: "Customer thanked the onboarding team for a smooth kickoff workshop.",
      },
    ];

    const inferred = inferCustomerNoteSignals(notes, structured);
    expect(inferred.every((s) => s.tags.length === 0)).toBe(true);
    const phishingNotes = inferred.filter((s) => s.theme === "phishing-payments");
    expect(phishingNotes.length).toBeGreaterThanOrEqual(3);
    expect(inferred.some((s) => s.id === "CUST-0047")).toBe(false);
  });

  it("boosts unified risks when unstructured notes repeatedly reference a flagged theme", async () => {
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO customer_notes (id, customer_id, channel, recorded_at, author, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 1; i <= 4; i++) {
      insert.run(
        `CUST-P${i}`,
        `CUS-200${i}`,
        "email",
        "2026-09-10",
        null,
        `Phishing payment mailbox spoof attempt number ${i} reported by customer.`,
      );
    }

    const risks = await listUnifiedRisks(FULL_RANGE);
    const phishing = risks.find((r) => r.id === "RSK-phishing-payments");
    expect(phishing).toBeTruthy();
    expect(phishing?.evidenceCount).toBeGreaterThanOrEqual(8);
    expect(phishing?.sourceTypes).toContain("customer_note");
  });
});
