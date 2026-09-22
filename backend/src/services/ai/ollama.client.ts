export class AiUnavailableError extends Error {
  readonly code = "AI_UNAVAILABLE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export class AiResponseError extends Error {
  readonly code = "AI_RESPONSE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiResponseError";
  }
}

/** @deprecated Use AiUnavailableError */
export const OllamaUnavailableError = AiUnavailableError;
/** @deprecated Use AiResponseError */
export const OllamaResponseError = AiResponseError;

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** @deprecated Use AiChatMessage */
export type OllamaChatMessage = AiChatMessage;

type Provider = "ollama" | "openrouter";

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string } | string;
};

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "mistral";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 600_000;

function getProvider(): Provider {
  const explicit = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (explicit === "openrouter" || explicit === "ollama") {
    return explicit;
  }
  // Prefer OpenRouter when an API key is configured.
  return process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : "ollama";
}

function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
}

function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;
}

function getOpenRouterBaseUrl(): string {
  return (process.env.OPENROUTER_BASE_URL ?? DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, "");
}

function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;
}

function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AiUnavailableError(
      "OPENROUTER_API_KEY is not set. Add it to backend/.env (Authorization: Bearer <key>).",
    );
  }
  return key;
}

async function chatJsonOllama(messages: AiChatMessage[]): Promise<string> {
  const url = `${getOllamaBaseUrl()}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getOllamaModel(),
        messages,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `Ollama returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) {
      throw new AiUnavailableError(`Ollama error: ${data.error}`);
    }

    const content = data.message?.content?.trim();
    if (!content) {
      throw new AiResponseError("Ollama returned an empty message");
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError || err instanceof AiResponseError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        `Ollama timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. Is ${getOllamaModel()} running?`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown Ollama failure";
    throw new AiUnavailableError(
      `Cannot reach Ollama at ${getOllamaBaseUrl()}. Start it with \`ollama serve\` and ensure model \`${getOllamaModel()}\` is available. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function chatJsonOpenRouter(messages: AiChatMessage[]): Promise<string> {
  const url = `${getOpenRouterBaseUrl()}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-OpenRouter-Title"] = title;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages,
        stream: false,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `OpenRouter returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error.message;
      throw new AiUnavailableError(`OpenRouter error: ${errMsg ?? "unknown"}`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiResponseError("OpenRouter returned an empty message");
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError || err instanceof AiResponseError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        `OpenRouter timed out after ${DEFAULT_TIMEOUT_MS / 1000}s (model: ${getOpenRouterModel()}).`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown OpenRouter failure";
    throw new AiUnavailableError(
      `Cannot reach OpenRouter at ${getOpenRouterBaseUrl()}. Check OPENROUTER_API_KEY and network. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function chatTextOllama(messages: AiChatMessage[]): Promise<string> {
  const url = `${getOllamaBaseUrl()}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getOllamaModel(),
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `Ollama returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) {
      throw new AiUnavailableError(`Ollama error: ${data.error}`);
    }

    const content = data.message?.content?.trim();
    if (!content) {
      throw new AiResponseError("Ollama returned an empty message");
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError || err instanceof AiResponseError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        `Ollama timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. Is ${getOllamaModel()} running?`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown Ollama failure";
    throw new AiUnavailableError(
      `Cannot reach Ollama at ${getOllamaBaseUrl()}. Start it with \`ollama serve\` and ensure model \`${getOllamaModel()}\` is available. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function chatTextOpenRouter(messages: AiChatMessage[]): Promise<string> {
  const url = `${getOpenRouterBaseUrl()}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
  };
  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-OpenRouter-Title"] = title;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiUnavailableError(
        `OpenRouter returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    if (data.error) {
      const errMsg = typeof data.error === "string" ? data.error : data.error.message;
      throw new AiUnavailableError(`OpenRouter error: ${errMsg ?? "unknown"}`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiResponseError("OpenRouter returned an empty message");
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError || err instanceof AiResponseError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiUnavailableError(
        `OpenRouter timed out after ${DEFAULT_TIMEOUT_MS / 1000}s (model: ${getOpenRouterModel()}).`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown OpenRouter failure";
    throw new AiUnavailableError(
      `Cannot reach OpenRouter at ${getOpenRouterBaseUrl()}. Check OPENROUTER_API_KEY and network. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatJson(messages: AiChatMessage[]): Promise<string> {
  return getProvider() === "openrouter"
    ? chatJsonOpenRouter(messages)
    : chatJsonOllama(messages);
}

/** Free-text chat (no forced JSON mode). */
export async function chat(messages: AiChatMessage[]): Promise<string> {
  return getProvider() === "openrouter" ? chatTextOpenRouter(messages) : chatTextOllama(messages);
}
