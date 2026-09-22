import { beforeEach, describe, expect, it, vi } from "vitest";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";

vi.mock("../../services/ai/embeddings.client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/ai/embeddings.client.js")>();
  return {
    ...actual,
    embedTexts: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
  };
});

vi.mock("../../services/ai/mocIntelligence.service.js", () => ({
  concludeFromEvidence: vi.fn(async () => ({
    recommendation: "go_with_conditions",
    rationale: "Open high-severity incident on TM-Core with elevated backlog.",
    findings: [
      {
        id: "F-1",
        code: "open_incident",
        title: "Open high-severity incident",
        severity: "critical",
        reason: "INC-4402 remains open on TM-Core.",
        evidenceRefs: ["INC-4402"],
      },
    ],
    caveats: [],
  })),
}));

describe("mocReport.service", () => {
  beforeEach(() => {
    openTempDb();
    seedMinimalEvidence();
    process.env.RAG_TOP_K = "6";
  });

  it("returns null for unknown change ids", async () => {
    const { mocReportService } = await import("../../services/reports/mocReport.service.js");
    await expect(mocReportService.getByChangeId("nope")).resolves.toBeNull();
  });

  it("assembles a decision brief from RAG evidence + intelligence", async () => {
    const { mocReportService } = await import("../../services/reports/mocReport.service.js");
    const report = await mocReportService.getByChangeId("1001");

    expect(report).not.toBeNull();
    expect(report?.change.id).toBe("1001");
    expect(report?.recommendation).toBe("go_with_conditions");
    expect(report?.evidence.incidents.some((i) => i.id === "INC-4402")).toBe(true);
    expect(report?.evidence.riskRecord?.residualRisk).toBe("high");
    expect(report?.findings[0]?.evidenceRefs).toContain("INC-4402");
  });
});
