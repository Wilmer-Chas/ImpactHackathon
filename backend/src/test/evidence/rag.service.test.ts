import { beforeEach, describe, expect, it, vi } from "vitest";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";
import { getChangeById } from "../../repository/index.js";

vi.mock("../../services/ai/embeddings.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/ai/embeddings.client.js")>();
  return {
    ...actual,
    embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
  };
});

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
});
