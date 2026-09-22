import type { ChatSession, ChatSessionSummary } from "../../domain/chat/chat.js";
import type { AiChatMessage } from "../ai/ollama.client.js";
import {
  answerWithEvidence,
  type ChatFilterAction,
} from "../ai/chatIntelligence.service.js";
import { retrieveEvidenceContextForQuery } from "../evidence/rag.service.js";
import * as chatRepo from "../../repository/chat.repository.js";

export type ChatReply = {
  sessionId: string;
  reply: string;
  citations: string[];
  filterAction?: ChatFilterAction;
};

export const chatService = {
  listSessions(): ChatSessionSummary[] {
    return chatRepo.listChatSessions();
  },

  getSession(id: string): ChatSession | null {
    return chatRepo.getChatSession(id);
  },

  createSession(): ChatSession {
    return chatRepo.createChatSession("New chat");
  },

  async sendMessage(input: { sessionId?: string; message: string }): Promise<ChatReply> {
    const message = input.message.trim();
    if (!message) {
      throw new Error("message is required");
    }

    let sessionId = input.sessionId?.trim();
    if (!sessionId) {
      sessionId = chatRepo.createChatSession(message.slice(0, 80)).id;
    } else if (!chatRepo.getChatSession(sessionId)) {
      throw new Error(`Chat session ${sessionId} not found`);
    }

    chatRepo.appendChatMessage(sessionId, "user", message, message);

    const session = chatRepo.getChatSession(sessionId)!;
    const history: AiChatMessage[] = session.messages
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    const evidence = await retrieveEvidenceContextForQuery(message);
    const answer = await answerWithEvidence(message, history, evidence);
    chatRepo.appendChatMessage(sessionId, "assistant", answer.reply);

    return {
      sessionId,
      reply: answer.reply,
      citations: evidence.citations,
      ...(answer.filterAction ? { filterAction: answer.filterAction } : {}),
    };
  },
};
