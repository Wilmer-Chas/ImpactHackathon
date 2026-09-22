import { beforeEach, describe, expect, it, vi } from "vitest";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";
import { getChangeById } from "../../repository/index.js";
import { getDb } from "../../db/client.js";
import { serializeEmbedding } from "../../db/types.js";

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
    chatJson: vi.fn(async () =>
      JSON.stringify({
        summaries: {
          "RSK-batch-scoring":
            "Batch scoring instability remains elevated (INC-4402, ALT-4402).",
        },
      }),
    ),
  };
});

/** Extra rows for chat RAG allowlist / exclusion / risk-expansion coverage. */
function seedChatEvidenceExtras() {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE incidents
     SET theme = ?, tags_json = ?, category = ?, opened_at = ?
     WHERE id = ?`,
  ).run(
    "batch-scoring",
    JSON.stringify(["batch-scoring", "high-risk"]),
    "Operational",
    "2026-07-01",
    "INC-4402",
  );

  db.prepare(
    `INSERT INTO ops_alerts (
       id, application, title, severity, status, theme, tags_json, category, opened_at, source_system
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "ALT-4402",
    "TM-Core",
    "Scoring backlog breach",
    "high",
    "open",
    "batch-scoring",
    JSON.stringify(["batch-scoring", "high-risk"]),
    "Operational",
    "2026-07-01",
    "PagerDuty",
  );

  db.prepare(
    `INSERT INTO customer_notes (
       id, customer_id, channel, recorded_at, author, body
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "NOTE-SENSITIVE-1",
    "CUST-1",
    "chat",
    "2026-09-09",
    "Agent",
    "Customer disclosed account number 1234567890 during scoring outage complaint.",
  );

  const insertChunk = db.prepare(
    `INSERT INTO evidence_chunks (
       id, entity_type, entity_id, text, content_hash, embedding, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  insertChunk.run(
    "ops_alert:ALT-4402",
    "ops_alert",
    "ALT-4402",
    "Ops alert ALT-4402 Scoring backlog breach batch-scoring",
    "hash-alt",
    serializeEmbedding([0.95, 0.05, 0]),
    now,
  );
  // Highest similarity to mocked query vector [1,0,0] — must not appear in chat evidence.
  insertChunk.run(
    "customer_note:NOTE-SENSITIVE-1",
    "customer_note",
    "NOTE-SENSITIVE-1",
    "Customer note NOTE-SENSITIVE-1 account number complaint",
    "hash-note",
    serializeEmbedding([1, 0, 0]),
    now,
  );
  insertChunk.run(
    "change:1001",
    "change",
    "1001",
    "Change 1001 Lower alert thresholds",
    "hash-chg",
    serializeEmbedding([0.99, 0.01, 0]),
    now,
  );
}

describe("rag.service", () => {
  beforeEach(() => {
    openTempDb();
    seedMinimalEvidence();
    process.env.RAG_TOP_K = "6";
  });

  it("builds an evidence pack for a change with anchors and retrieved incidents", async () => {
    const { retrieveEvidencePackForChange } = await import(
      "../../services/evidence/rag.service.js"
    );
    const change = getChangeById("1001");
    expect(change).not.toBeNull();

    const pack = await retrieveEvidencePackForChange(change!);

    expect(pack.riskRecord?.changeType).toBe("rule_threshold");
    expect(pack.release?.id).toBe("REL-2026-09");
    expect(pack.incidents.some((i) => i.id === "INC-4402")).toBe(true);
    expect(pack.processMetrics.length).toBeGreaterThan(0);
    expect(pack.performanceMetrics.length).toBeGreaterThan(0);
    expect(pack.dataQuality.length).toBeGreaterThan(0);
  });

  it("builds portfolio briefing pack with agenda and high-severity posture", async () => {
    const { retrievePortfolioEvidenceForBriefing } = await import(
      "../../services/evidence/rag.service.js"
    );
    const { pack, agendaChanges } = await retrievePortfolioEvidenceForBriefing();

    expect(agendaChanges.map((c) => c.id)).toContain("1001");
    expect(pack.meeting.portfolio).toBe("Transaction Monitoring");
    expect(pack.posture.openHighSeverityIncidents.some((i) => i.id === "INC-4402")).toBe(true);
    expect(pack.posture.release?.id).toBe("REL-2026-09");
    expect(pack.agenda.some((a) => a.changeId === "1001")).toBe(true);
  });

  it("chat evidence excludes customer notes and change chunks", async () => {
    seedChatEvidenceExtras();
    const { retrieveEvidenceContextForQuery } = await import(
      "../../services/evidence/rag.service.js"
    );

    const evidence = await retrieveEvidenceContextForQuery(
      "Why is scoring unstable for customers?",
    );

    expect(evidence.evidenceText).not.toContain("customer_note");
    expect(evidence.evidenceText).not.toContain("NOTE-SENSITIVE-1");
    expect(evidence.evidenceText).not.toContain("account number");
    expect(evidence.citations.every((c) => !c.startsWith("customer_note:"))).toBe(true);
    expect(evidence.citations.every((c) => !c.startsWith("change:"))).toBe(true);
  });

  it("chat evidence enriches incidents with theme, tags, and root cause", async () => {
    seedChatEvidenceExtras();
    const { retrieveEvidenceContextForQuery } = await import(
      "../../services/evidence/rag.service.js"
    );

    const evidence = await retrieveEvidenceContextForQuery("Tell me about INC-4402");

    expect(evidence.citations).toContain("incident:INC-4402");
    expect(evidence.evidenceText).toContain("theme=batch-scoring");
    expect(evidence.evidenceText).toContain("high-risk");
    expect(evidence.evidenceText).toContain("Downstream queue backpressure");
    expect(evidence.evidenceText).toContain("openedAt=2026-07-01");
  });

  it("chat evidence force-anchors RSK ids and expands incident/ops alert refs", async () => {
    seedChatEvidenceExtras();
    const { retrieveEvidenceContextForQuery } = await import(
      "../../services/evidence/rag.service.js"
    );

    const evidence = await retrieveEvidenceContextForQuery(
      "Why is RSK-batch-scoring flagged?",
    );

    expect(evidence.citations).toContain("enterprise_risk:RSK-batch-scoring");
    expect(evidence.evidenceText).toContain("Risk flag rationale");
    expect(evidence.evidenceText).toContain("INC-4402");
    expect(evidence.evidenceText).toContain("ALT-4402");
    expect(evidence.citations).toContain("incident:INC-4402");
    expect(evidence.citations).toContain("ops_alert:ALT-4402");
    expect(evidence.evidenceText).not.toContain("NOTE-SENSITIVE-1");
  });

  it("chat evidence includes data quality when retrieved", async () => {
    seedChatEvidenceExtras();
    const db = getDb();
    db.prepare(`UPDATE evidence_chunks SET embedding = ? WHERE id = ?`).run(
      serializeEmbedding([1, 0, 0]),
      "data_quality:incidents|rootCause",
    );
    db.prepare(
      `UPDATE data_quality SET theme = ?, tags_json = ?, category = ? WHERE source = ? AND field = ?`,
    ).run(
      "data-completeness",
      JSON.stringify(["data-completeness"]),
      "Regulatory",
      "incidents",
      "rootCause",
    );
    db.prepare(`UPDATE evidence_chunks SET embedding = ? WHERE id = ?`).run(
      serializeEmbedding([0.1, 0.9, 0]),
      "incident:INC-4402",
    );
    db.prepare(`UPDATE evidence_chunks SET embedding = ? WHERE id = ?`).run(
      serializeEmbedding([0.1, 0.9, 0]),
      "ops_alert:ALT-4402",
    );

    const { retrieveEvidenceContextForQuery } = await import(
      "../../services/evidence/rag.service.js"
    );
    const evidence = await retrieveEvidenceContextForQuery("data quality rootCause gaps");

    expect(evidence.citations).toContain("data_quality:incidents|rootCause");
    expect(evidence.evidenceText).toContain("theme=data-completeness");
    expect(evidence.evidenceText).toContain("missingRate");
  });
});
