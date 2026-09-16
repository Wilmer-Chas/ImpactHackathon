import type {
  ChangeRequest,
  DataQualityIssue,
  Finding,
  FindingSeverity,
  Incident,
  PerformanceMetric,
  ProcessMetric,
  Recommendation,
  ReleasePlan,
  RiskRecord,
} from "../../domain/index.js";
import { chatJson, OllamaResponseError } from "./ollama.client.js";

export class MocIntelligenceValidationError extends Error {
  readonly code = "MOC_INTELLIGENCE_INVALID" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MocIntelligenceValidationError";
  }
}

export type EvidencePack = {
  incidents: Incident[];
  processMetrics: ProcessMetric[];
  performanceMetrics: PerformanceMetric[];
  riskRecord: RiskRecord | null;
  release: ReleasePlan | null;
  dataQuality: DataQualityIssue[];
};

export type IntelligenceConclusion = {
  recommendation: Recommendation;
  rationale: string;
  findings: Finding[];
  caveats: string[];
};

const RECOMMENDATIONS = new Set<Recommendation>(["go", "go_with_conditions", "defer"]);
const SEVERITIES = new Set<FindingSeverity>(["info", "warning", "critical"]);

const SYSTEM_PROMPT = `You are the intelligence engine for Impact. You prepare Management Oversight Committee (MOC) decision briefs for a Transaction Monitoring (TM / AML) product owner who reports to upper organization.

Your job:
- Read ONLY the evidence provided in the user message.
- Conclude whether the committee should authorize the change: "go", "go_with_conditions", or "defer".
- Explain the conclusion in plain, short, audit-friendly language suitable for MOC / upper-org readers.
- Produce structured findings tied to real evidence IDs from the payload. Never invent IDs, metrics, or incidents.
- Do not invent numeric risk scores. Decide from the evidence.

Decision guidance (API values → committee stance):
- defer (Hold) — serious open issues on the same app, unsafe timing (freeze), or evidence too weak to defend.
- go_with_conditions (Authorize with conditions) — proceed only with clear safeguards (monitoring, rollback, wait for an issue to close, limit scope).
- go (Authorize) — no major blockers; evidence supports proceeding.

Output MUST be a single JSON object with this exact shape:
{
  "recommendation": "go" | "go_with_conditions" | "defer",
  "rationale": "one clear sentence",
  "findings": [
    {
      "id": "F-...",
      "code": "short_snake_code",
      "title": "short title",
      "severity": "info" | "warning" | "critical",
      "reason": "plain-language reason",
      "evidenceRefs": ["ids from the evidence"]
    }
  ],
  "caveats": ["what is incomplete or uncertain"]
}

Rules for findings:
- Include at least one finding when recommendation is not "go".
- List every material reason as its own finding (open incident, backlog, SLA miss, high residual risk, audit/freeze, weak data). Do not collapse multiple issues into one vague sentence.
- Titles: short factual labels (what is wrong), not advice.
- reason: one concrete fact from the evidence (numbers, IDs, status). No speculative or coaching tone.
- Prefer severity "critical" for blockers, "warning" for conditions, "info" for confidence notes.
- evidenceRefs must cite real IDs from the pack.
- caveats may be an empty array only if the evidence pack looks complete.
- rationale: one short decision line for the PO and MOC, not a multi-sentence essay.`;

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

function parseFinding(value: unknown, index: number): Finding {
  if (!isRecord(value)) {
    throw new MocIntelligenceValidationError(`Finding at index ${index} is not an object`);
  }

  const severity = asNonEmptyString(value.severity, `findings[${index}].severity`);
  if (!SEVERITIES.has(severity as FindingSeverity)) {
    throw new MocIntelligenceValidationError(
      `Invalid finding severity at index ${index}: ${severity}`,
    );
  }

  return {
    id: asNonEmptyString(value.id, `findings[${index}].id`),
    code: asNonEmptyString(value.code, `findings[${index}].code`),
    title: asNonEmptyString(value.title, `findings[${index}].title`),
    severity: severity as FindingSeverity,
    reason: asNonEmptyString(value.reason, `findings[${index}].reason`),
    evidenceRefs: asStringArray(value.evidenceRefs, `findings[${index}].evidenceRefs`),
  };
}

export function parseIntelligenceConclusion(raw: string): IntelligenceConclusion {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new MocIntelligenceValidationError("Model did not return valid JSON", { cause: err });
  }

  if (!isRecord(parsed)) {
    throw new MocIntelligenceValidationError("Model JSON root must be an object");
  }

  const recommendation = asNonEmptyString(parsed.recommendation, "recommendation");
  if (!RECOMMENDATIONS.has(recommendation as Recommendation)) {
    throw new MocIntelligenceValidationError(`Invalid recommendation: ${recommendation}`);
  }

  if (!Array.isArray(parsed.findings)) {
    throw new MocIntelligenceValidationError("findings must be an array");
  }

  const findings = parsed.findings.map((finding, index) => parseFinding(finding, index));
  const caveats = asStringArray(parsed.caveats ?? [], "caveats");
  const rationale = asNonEmptyString(parsed.rationale, "rationale");

  if (recommendation !== "go" && findings.length === 0) {
    throw new MocIntelligenceValidationError(
      "Non-go recommendations must include at least one finding",
    );
  }

  return {
    recommendation: recommendation as Recommendation,
    rationale,
    findings,
    caveats,
  };
}

export async function concludeFromEvidence(
  change: ChangeRequest,
  evidence: EvidencePack,
): Promise<IntelligenceConclusion> {
  const userPayload = {
    task: "Produce a structured MOC decision brief for this agenda item, for upper-organization oversight.",
    change,
    evidence,
  };

  const raw = await chatJson([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify(userPayload),
    },
  ]);

  try {
    return parseIntelligenceConclusion(raw);
  } catch (err: unknown) {
    if (err instanceof MocIntelligenceValidationError) {
      throw err;
    }
    throw new OllamaResponseError("Failed to interpret Ollama JSON output", { cause: err });
  }
}
