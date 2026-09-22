import type {
  BriefingNarrative,
  FindingSeverity,
  OrgRiskPosture,
  PostureSignal,
} from "../../domain/index.js";
import { AiResponseError, chatJson } from "./ollama.client.js";
import { MocIntelligenceValidationError } from "./mocIntelligence.service.js";

export type PortfolioEvidencePack = {
  meeting: {
    title: string;
    portfolio: string;
    preparedBy: string;
    preparedAt: string;
  };
  posture: OrgRiskPosture;
  agenda: Array<{
    changeId: string;
    title: string;
    application: string;
    changeType: string;
    residualRisk: string | null;
    status: string;
  }>;
};

const SEVERITIES = new Set<FindingSeverity>(["info", "warning", "critical"]);

const BRIEFING_SYSTEM_PROMPT = `You are the intelligence engine for Impact. You prepare Management Oversight Committee (MOC) briefing material for a Transaction Monitoring (TM / AML) product owner who reports to upper organization.

Your job:
- Read ONLY the portfolio evidence in the user message (this stands in for Jira / ServiceNow / risk / ops extracts).
- Decide what matters for the committee. Do NOT dump raw ticket or metric fields as slide copy.
- Produce a short presentation narrative: title framing, org posture risk signals, and agenda framing.
- Flag risks that are material for oversight. Every signal must cite real evidence from the pack (incident IDs, process names, metric names, release id, change ids, risk changeType, or data-quality source/field).
- Never invent IDs, numbers, incidents, or residual-risk levels. Use only values present in the evidence.
- Do not invent numeric risk scores.

Output MUST be a single JSON object with this exact shape:
{
  "titleSummary": "one sentence for the title slide — why this MOC matters now",
  "postureSummary": "one sentence overview of portfolio risk posture",
  "postureSignals": [
    {
      "id": "PS-...",
      "headline": "short risk flag for leadership",
      "detail": "one concrete sentence grounded in evidence numbers/IDs/status",
      "severity": "info" | "warning" | "critical",
      "evidenceRefs": ["real ids or field keys from the pack"]
    }
  ],
  "agendaIntro": "one sentence introducing why these items are on the agenda",
  "agendaNotes": {
    "<changeId>": "one short note on why this item needs an MOC stance, citing pack facts"
  }
}

Rules:
- postureSignals: 3 to 5 items, most material first. Prefer critical/warning when evidence supports it.
- headline: risk-oriented label, not a raw field dump.
- detail: must include at least one concrete fact from evidence (number, ID, status, window).
- evidenceRefs must be non-empty and must appear in the provided pack (e.g. INC-4402, REL-2026-09, processName, metricName, change id, changeType, "incidents.rootCause").
- agendaNotes must include a key for every agenda changeId in the pack; value is one short sentence.
- Do not recommend Authorize/Hold here — that is the per-item decision brief. Focus on portfolio posture and why items are on the agenda.
- Plain language for upper organization. No coaching tone.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MocIntelligenceValidationError(`Invalid or missing string field: ${field}`);
  }
  return value.trim();
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new MocIntelligenceValidationError(`Invalid string array: ${field}`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function parsePostureSignal(value: unknown, index: number): PostureSignal {
  if (!isRecord(value)) {
    throw new MocIntelligenceValidationError(`postureSignals[${index}] is not an object`);
  }

  const severity = asNonEmptyString(value.severity, `postureSignals[${index}].severity`);
  if (!SEVERITIES.has(severity as FindingSeverity)) {
    throw new MocIntelligenceValidationError(
      `Invalid posture signal severity at index ${index}: ${severity}`,
    );
  }

  const evidenceRefs = asStringArray(
    value.evidenceRefs,
    `postureSignals[${index}].evidenceRefs`,
  );
  if (evidenceRefs.length === 0) {
    throw new MocIntelligenceValidationError(
      `postureSignals[${index}].evidenceRefs must not be empty`,
    );
  }

  return {
    id: asNonEmptyString(value.id, `postureSignals[${index}].id`),
    headline: asNonEmptyString(value.headline, `postureSignals[${index}].headline`),
    detail: asNonEmptyString(value.detail, `postureSignals[${index}].detail`),
    severity: severity as FindingSeverity,
    evidenceRefs,
  };
}

export function parseBriefingNarrative(
  raw: string,
  agendaChangeIds: string[],
): BriefingNarrative {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new MocIntelligenceValidationError("Model did not return valid JSON", { cause: err });
  }

  if (!isRecord(parsed)) {
    throw new MocIntelligenceValidationError("Model JSON root must be an object");
  }

  if (!Array.isArray(parsed.postureSignals)) {
    throw new MocIntelligenceValidationError("postureSignals must be an array");
  }

  const postureSignals = parsed.postureSignals.map((signal, index) =>
    parsePostureSignal(signal, index),
  );

  if (postureSignals.length < 3 || postureSignals.length > 5) {
    throw new MocIntelligenceValidationError(
      `postureSignals must contain 3 to 5 items (got ${postureSignals.length})`,
    );
  }

  if (!isRecord(parsed.agendaNotes)) {
    throw new MocIntelligenceValidationError("agendaNotes must be an object");
  }

  const agendaNotes: Record<string, string> = {};
  for (const changeId of agendaChangeIds) {
    agendaNotes[changeId] = asNonEmptyString(
      parsed.agendaNotes[changeId],
      `agendaNotes.${changeId}`,
    );
  }

  return {
    titleSummary: asNonEmptyString(parsed.titleSummary, "titleSummary"),
    postureSummary: asNonEmptyString(parsed.postureSummary, "postureSummary"),
    postureSignals,
    agendaIntro: asNonEmptyString(parsed.agendaIntro, "agendaIntro"),
    agendaNotes,
  };
}

export async function authorBriefingNarrative(
  pack: PortfolioEvidencePack,
): Promise<BriefingNarrative> {
  const agendaChangeIds = pack.agenda.map((item) => item.changeId);

  const userPayload = {
    task: "Author MOC briefing presentation narrative from this portfolio evidence pack. Prioritize and flag risks; do not dump raw source fields.",
    pack,
  };

  const raw = await chatJson([
    { role: "system", content: BRIEFING_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(userPayload) },
  ]);

  try {
    return parseBriefingNarrative(raw, agendaChangeIds);
  } catch (err: unknown) {
    if (err instanceof MocIntelligenceValidationError) {
      throw err;
    }
    throw new AiResponseError("Failed to interpret briefing JSON output", {
      cause: err,
    });
  }
}
