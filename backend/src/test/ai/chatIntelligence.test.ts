import { describe, expect, it } from "vitest";
import {
  ChatIntelligenceValidationError,
  parseChatAnswer,
} from "../../services/ai/chatIntelligence.service.js";

describe("parseChatAnswer", () => {
  it("parses a reply without filterAction", () => {
    const result = parseChatAnswer(
      JSON.stringify({ reply: "Here is what INC-4402 shows.", filterAction: null }),
    );
    expect(result).toEqual({ reply: "Here is what INC-4402 shows." });
  });

  it("parses set_filters actions", () => {
    const result = parseChatAnswer(
      JSON.stringify({
        reply: "Filtered to Q3 phishing.",
        filterAction: {
          type: "set_filters",
          filters: { from: "2026-07", to: "2026-09", wording: "phishing" },
        },
      }),
    );
    expect(result.filterAction).toEqual({
      type: "set_filters",
      filters: { from: "2026-07", to: "2026-09", wording: "phishing" },
    });
  });

  it("parses clear_filters actions", () => {
    const result = parseChatAnswer(
      JSON.stringify({
        reply: "Cleared active filters.",
        filterAction: { type: "clear_filters" },
      }),
    );
    expect(result.filterAction).toEqual({ type: "clear_filters" });
  });

  it("rejects invalid periods", () => {
    expect(() =>
      parseChatAnswer(
        JSON.stringify({
          reply: "bad",
          filterAction: { type: "set_filters", filters: { from: "July" } },
        }),
      ),
    ).toThrow(ChatIntelligenceValidationError);
  });

  it("rejects empty set_filters payloads", () => {
    expect(() =>
      parseChatAnswer(
        JSON.stringify({
          reply: "bad",
          filterAction: { type: "set_filters", filters: {} },
        }),
      ),
    ).toThrow(ChatIntelligenceValidationError);
  });

  it("rejects non-JSON", () => {
    expect(() => parseChatAnswer("not json")).toThrow(ChatIntelligenceValidationError);
  });
});
