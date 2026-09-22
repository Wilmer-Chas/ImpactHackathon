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

export type ChatAppFilters = {
  from?: string;
  to?: string;
  wording?: string;
};

export type ChatFilterAction =
  | { type: "set_filters"; filters: ChatAppFilters }
  | { type: "clear_filters" };

export type ChatReply = {
  sessionId: string;
  reply: string;
  citations: string[];
  filterAction?: ChatFilterAction;
};
