import { createHash } from "node:crypto";
import { AiUnavailableError } from "./ollama.client.js";

const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
const DEFAULT_TIMEOUT_MS = 120_000;

type OpenRouterEmbeddingResponse = {
  data?: Array<{ embedding?: number[]; index?: number }>;
  error?: { message?: string } | string;
};

function getBaseUrl(): string {
  return (process.env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, "");
}

function getEmbeddingModel(): string {
  return process.env.OPENROUTER_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AiUnavailableError(
      "OPENROUTER_API_KEY is not set. Required for embeddings (Authorization: Bearer <key>).",
    );
  }
  return key;
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return -1;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) {
    return -1;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const url = `${getBaseUrl()}/embeddings`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getEmbeddingModel(),
        input: texts,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `OpenRouter embeddings returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OpenRouterEmbeddingResponse;
    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error.message;
      throw new AiUnavailableError(`OpenRouter embeddings error: ${errMsg ?? "unknown"}`);
    }

    const sorted = [...(data.data ?? [])].sort((x, y) => (x.index ?? 0) - (y.index ?? 0));
    if (sorted.length !== texts.length) {
      throw new AiUnavailableError(
        `OpenRouter embeddings count mismatch: expected ${texts.length}, got ${sorted.length}`,
      );
    }

    return sorted.map((item, index) => {
      const embedding = item.embedding;
      if (!embedding || embedding.length === 0) {
        throw new AiUnavailableError(`OpenRouter returned empty embedding at index ${index}`);
      }
      return embedding;
    });
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        `OpenRouter embeddings timed out after ${DEFAULT_TIMEOUT_MS / 1000}s (model: ${getEmbeddingModel()}).`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown embeddings failure";
    throw new AiUnavailableError(
      `Cannot reach OpenRouter embeddings at ${getBaseUrl()}. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}
