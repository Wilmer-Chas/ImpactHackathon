import type { AiChatMessage } from "./ollama.client.js";
import { chat } from "./ollama.client.js";
import type { ChatEvidenceContext } from "../evidence/rag.service.js";

const SYSTEM_PROMPT = `You are Impact's General Assistant for a Transaction Monitoring product owner.
Answer clearly and helpfully. When portfolio evidence is provided, ground claims in that evidence and cite IDs that appear in the evidence (e.g. INC-4402, change 1001). Never invent evidence IDs or numeric risk scores. If evidence is insufficient, say what is missing.`;

export async function answerWithEvidence(
  userMessage: string,
  history: AiChatMessage[],
  evidence: ChatEvidenceContext,
): Promise<string> {
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
  return chat(messages);
}
