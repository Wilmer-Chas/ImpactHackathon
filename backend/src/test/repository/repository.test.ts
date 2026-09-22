import { beforeEach, describe, expect, it } from "vitest";
import {
  getChangeById,
  getRiskByChangeType,
  getReleaseForChange,
  listIncidentsByApplication,
} from "../../repository/index.js";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";

describe("repository", () => {
  beforeEach(() => {
    openTempDb();
    seedMinimalEvidence();
  });

  it("loads change by id", () => {
    const change = getChangeById("1001");
    expect(change).not.toBeNull();
    expect(change?.application).toBe("TM-Core");
    expect(change?.changeType).toBe("rule_threshold");
  });

  it("returns null for unknown change", () => {
    expect(getChangeById("9999")).toBeNull();
  });

  it("filters incidents by application", () => {
    const incidents = listIncidentsByApplication("TM-Core");
    expect(incidents).toHaveLength(1);
    expect(incidents[0]?.id).toBe("INC-4402");
    expect(listIncidentsByApplication("Other-App")).toHaveLength(0);
  });

  it("resolves risk and release anchors for a change", () => {
    expect(getRiskByChangeType("rule_threshold")?.residualRisk).toBe("high");
    const release = getReleaseForChange("1001");
    expect(release?.id).toBe("REL-2026-09");
    expect(release?.changeIds).toContain("1001");
    expect(release?.auditPeriodActive).toBe(true);
  });
});
