import type { ChatMessage, ChatSession, ChatSessionSummary } from "../domain/chat/chat.js";
import { getDb } from "../db/client.js";
import { randomUUID } from "node:crypto";

type SessionRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
};

function mapSession(row: SessionRow): ChatSessionSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    createdAt: row.created_at,
  };
}

export function listChatSessions(): ChatSessionSummary[] {
  const rows = getDb()
    .prepare("SELECT * FROM chat_sessions ORDER BY updated_at DESC")
    .all() as SessionRow[];
  return rows.map(mapSession);
}

export function getChatSession(id: string): ChatSession | null {
  const row = getDb().prepare("SELECT * FROM chat_sessions WHERE id = ?").get(id) as
    | SessionRow
    | undefined;
  if (!row) {
    return null;
  }
  const messages = getDb()
    .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(id) as MessageRow[];
  return { ...mapSession(row), messages: messages.map(mapMessage) };
}

export function createChatSession(title = "New chat"): ChatSession {
  const now = new Date().toISOString();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
    )
    .run(id, title, now, now);
  return { id, title, createdAt: now, updatedAt: now, messages: [] };
}

export function appendChatMessage(
  sessionId: string,
  role: ChatMessage["role"],
  content: string,
  titleIfEmpty?: string,
): ChatMessage {
  const db = getDb();
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId) as
    | SessionRow
    | undefined;
  if (!session) {
    throw new Error(`Chat session ${sessionId} not found`);
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO chat_messages (id, session_id, role, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, sessionId, role, content, now);

  const msgCount = (
    db.prepare("SELECT COUNT(*) AS c FROM chat_messages WHERE session_id = ?").get(sessionId) as {
      c: number;
    }
  ).c;

  let title = session.title;
  if (msgCount === 1 && titleIfEmpty?.trim()) {
    title = titleIfEmpty.trim().slice(0, 80);
  }

  db.prepare(`UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`).run(
    title,
    now,
    sessionId,
  );

  return { id, sessionId, role, content, createdAt: now };
}
