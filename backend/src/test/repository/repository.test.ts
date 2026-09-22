import { beforeEach, describe, expect, it } from "vitest";
import {
  getChangeById,
  getRiskByChangeType,
  getReleaseForChange,
  listIncidentsByApplication,
  listAllOpsAlerts,
  listAllDataQuality,
  listAllCustomerNotes,
} from "../../repository/index.js";
import { openTempDb, seedMinimalEvidence } from "../helpers/testDb.js";
import { getDb } from "../../db/client.js";

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

  it("maps ops alerts, themed data quality, and customer notes", () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO ops_alerts (
         id, application, title, severity, status, theme, tags_json, category,
         opened_at, source_system
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "ALT-1",
      "TM-Core",
      "Prometheus: scoring_p95 > SLA",
      "high",
      "open",
      "model-latency",
      JSON.stringify(["model-latency", "high-risk"]),
      "Operational",
      "2026-09-10",
      "PagerDuty",
    );
    db.prepare(
      `UPDATE data_quality SET theme = ?, tags_json = ?, category = ?
       WHERE source = ? AND field = ?`,
    ).run(
      "data-completeness",
      JSON.stringify(["data-completeness"]),
      "Regulatory",
      "incidents",
      "rootCause",
    );
    db.prepare(
      `INSERT INTO customer_notes (id, customer_id, channel, recorded_at, author, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "CUST-0001",
      "CUS-1000",
      "email",
      "2026-09-01",
      "Support L1",
      "Customer reported a phishing email about payment approval.",
    );

    const alerts = listAllOpsAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.id).toBe("ALT-1");
    expect(alerts[0]?.tags).toContain("high-risk");

    const dq = listAllDataQuality();
    const themed = dq.find((d) => d.source === "incidents" && d.field === "rootCause");
    expect(themed?.theme).toBe("data-completeness");
    expect(themed?.tags).toEqual(["data-completeness"]);

    const notes = listAllCustomerNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.id).toBe("CUST-0001");
    expect(notes[0]?.body).toContain("phishing");
  });
});
