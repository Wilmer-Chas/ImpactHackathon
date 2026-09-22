import type { AiChatMessage } from "./ollama.client.js";
import { AiResponseError, chatJson } from "./ollama.client.js";
import type { ChatEvidenceContext } from "../evidence/rag.service.js";

export class ChatIntelligenceValidationError extends Error {
  readonly code = "CHAT_INTELLIGENCE_INVALID" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ChatIntelligenceValidationError";
  }
}

export type ChatAppFilters = {
  from?: string;
  to?: string;
  wording?: string;
};

export type ChatFilterAction =
  | { type: "set_filters"; filters: ChatAppFilters }
  | { type: "clear_filters" };

export type ChatAnswer = {
  reply: string;
  filterAction?: ChatFilterAction;
};

const PERIOD_RE = /^\d{4}-\d{2}$/;

const SYSTEM_PROMPT = `You are Impact's General Assistant for a Transaction Monitoring product owner.
Answer clearly and helpfully. When portfolio evidence is provided, ground claims in that evidence and cite IDs that appear in the evidence (e.g. INC-4402, ALT-1001, RSK-phishing-payments). Never invent evidence IDs or numeric risk scores. If evidence is insufficient, say what is missing.

When a "Risk flag rationale" section is present, explain why those enterprise risks are flagged using only those facts: theme clusters of open incidents/ops alerts (and related structured signals), high-risk tags, severity, and period-end openness. Do not invent likelihood/impact scores beyond what the rationale states.

You may also control app display filters when the user asks to narrow what the UI shows (timeframe and/or wording). Filters only affect what the frontend displays; they do not change stored data.

Respond with JSON only, matching this shape:
{
  "reply": string,
  "filterAction": null | { "type": "set_filters", "filters": { "from"?: "YYYY-MM", "to"?: "YYYY-MM", "wording"?: string } } | { "type": "clear_filters" }
}

Rules for filterAction:
- Use set_filters when the user asks to filter/show only a timeframe (quarters → month ranges, e.g. Q3 2026 → from "2026-07" to "2026-09") and/or wording/topic.
- Use clear_filters when the user asks to clear/reset/remove filters.
- Use null when the user is only asking a question and not requesting a filter change.
- Include at least one of from, to, or wording when type is set_filters.
- Periods must be YYYY-MM.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ChatIntelligenceValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalPeriod(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !PERIOD_RE.test(value.trim())) {
    throw new ChatIntelligenceValidationError(`${field} must be YYYY-MM`);
  }
  return value.trim();
}

function optionalWording(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ChatIntelligenceValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseFilterAction(value: unknown): ChatFilterAction | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new ChatIntelligenceValidationError("filterAction must be an object or null");
  }

  const type = asNonEmptyString(value.type, "filterAction.type");
  if (type === "clear_filters") {
    return { type: "clear_filters" };
  }
  if (type !== "set_filters") {
    throw new ChatIntelligenceValidationError(`Unknown filterAction.type: ${type}`);
  }

  if (!isRecord(value.filters)) {
    throw new ChatIntelligenceValidationError("filterAction.filters must be an object");
  }

  const filters: ChatAppFilters = {};
  const from = optionalPeriod(value.filters.from, "filterAction.filters.from");
  const to = optionalPeriod(value.filters.to, "filterAction.filters.to");
  const wording = optionalWording(value.filters.wording, "filterAction.filters.wording");
  if (from) filters.from = from;
  if (to) filters.to = to;
  if (wording) filters.wording = wording;

  if (!filters.from && !filters.to && !filters.wording) {
    throw new ChatIntelligenceValidationError(
      "set_filters requires at least one of from, to, or wording",
    );
  }

  return { type: "set_filters", filters };
}

export function parseChatAnswer(raw: string): ChatAnswer {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    throw new ChatIntelligenceValidationError("Model did not return valid JSON", { cause: err });
  }

  if (!isRecord(parsed)) {
    throw new ChatIntelligenceValidationError("Model JSON root must be an object");
  }

  const reply = asNonEmptyString(parsed.reply, "reply");
  const filterAction = parseFilterAction(parsed.filterAction);

  return filterAction ? { reply, filterAction } : { reply };
}

export async function answerWithEvidence(
  userMessage: string,
  history: AiChatMessage[],
  evidence: ChatEvidenceContext,
): Promise<ChatAnswer> {
  const messages: AiChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-8),
    {
      role: "user",
      content: [
        "Evidence pack (use only these IDs/facts):",
        evidence.evidenceText,
        "",
        `User question: ${userMessage}`,
      ].join("\n"),
    },
  ];

  const raw = await chatJson(messages);
  try {
    return parseChatAnswer(raw);
  } catch (err: unknown) {
    if (err instanceof ChatIntelligenceValidationError) {
      throw err;
    }
    throw new AiResponseError("Failed to interpret chat JSON output", { cause: err });
  }
}
