export class OllamaUnavailableError extends Error {
  readonly code = "OLLAMA_UNAVAILABLE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OllamaUnavailableError";
  }
}

export class OllamaResponseError extends Error {
  readonly code = "OLLAMA_RESPONSE" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OllamaResponseError";
  }
}

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "mistral";
const DEFAULT_TIMEOUT_MS = 600_000;

function getBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getModel(): string {
  return process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
}

export async function chatJson(messages: OllamaChatMessage[]): Promise<string> {
  const url = `${getBaseUrl()}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getModel(),
        messages,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new OllamaUnavailableError(
        `Ollama returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) {
      throw new OllamaUnavailableError(`Ollama error: ${data.error}`);
    }

    const content = data.message?.content?.trim();
    if (!content) {
      throw new OllamaResponseError("Ollama returned an empty message");
    }

    return content;
  } catch (err: unknown) {
    if (err instanceof OllamaUnavailableError || err instanceof OllamaResponseError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new OllamaUnavailableError(
        `Ollama timed out after ${DEFAULT_TIMEOUT_MS / 1000}s. Is mistral running?`,
        { cause: err },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown Ollama failure";
    throw new OllamaUnavailableError(
      `Cannot reach Ollama at ${getBaseUrl()}. Start it with \`ollama serve\` and ensure model \`${getModel()}\` is available. (${message})`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeout);
  }
}
