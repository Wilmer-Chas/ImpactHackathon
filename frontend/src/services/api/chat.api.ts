import type { ChatReply, ChatSession, ChatSessionSummary } from "../../types/chat";
import { apiGet, apiSend } from "./http";

export function listChatSessions(): Promise<ChatSessionSummary[]> {
  return apiGet("/api/chat/sessions");
}

export function getChatSession(id: string): Promise<ChatSession> {
  return apiGet(`/api/chat/sessions/${id}`);
}

export function createChatSession(): Promise<ChatSession> {
  return apiSend<ChatSession>("/api/chat/sessions", "POST") as Promise<ChatSession>;
}

export function sendChatMessage(input: {
  message: string;
  sessionId?: string;
}): Promise<ChatReply> {
  return apiSend<ChatReply>("/api/chat", "POST", input) as Promise<ChatReply>;
}
