export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatSession = ChatSessionSummary & {
  messages: ChatMessage[];
};
