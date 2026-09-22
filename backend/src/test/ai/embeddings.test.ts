import { describe, expect, it } from "vitest";
import { contentHash, cosineSimilarity } from "../../services/ai/embeddings.client.js";

describe("embeddings helpers", () => {
  it("contentHash is stable for the same text", () => {
    expect(contentHash("hello")).toBe(contentHash("hello"));
    expect(contentHash("hello")).not.toBe(contentHash("hello!"));
  });

  it("cosineSimilarity ranks identical vectors highest", () => {
    const a = [1, 0, 0];
    const b = [1, 0, 0];
    const c = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    expect(cosineSimilarity(a, c)).toBeCloseTo(0);
    expect(cosineSimilarity(a, c)).toBeLessThan(cosineSimilarity(a, b));
  });

  it("cosineSimilarity returns -1 for mismatched lengths", () => {
    expect(cosineSimilarity([1], [1, 2])).toBe(-1);
  });
});
