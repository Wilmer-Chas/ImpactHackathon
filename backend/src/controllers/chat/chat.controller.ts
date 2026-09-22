import type { Request, Response } from "express";
import { ChatIntelligenceValidationError } from "../../services/ai/chatIntelligence.service.js";
import {
  AiResponseError,
  AiUnavailableError,
} from "../../services/ai/ollama.client.js";
import { chatService } from "../../services/chat/chat.service.js";

export async function listChatSessions(_req: Request, res: Response): Promise<void> {
  res.json(chatService.listSessions());
}

export async function createChatSession(_req: Request, res: Response): Promise<void> {
  res.status(201).json(chatService.createSession());
}

export async function getChatSession(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  const session = chatService.getSession(id);
  if (!session) {
    res.status(404).json({ error: `Chat session ${id} not found` });
    return;
  }
  res.json(session);
}

export async function postChatMessage(req: Request, res: Response): Promise<void> {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined;

  try {
    const result = await chatService.sendMessage({ sessionId, message });
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AiUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof AiResponseError || err instanceof ChatIntelligenceValidationError) {
      res.status(502).json({ error: err.message });
      return;
    }
    const messageText = err instanceof Error ? err.message : "Unexpected chat error";
    if (messageText.includes("not found")) {
      res.status(404).json({ error: messageText });
      return;
    }
    if (messageText.includes("required")) {
      res.status(400).json({ error: messageText });
      return;
    }
    res.status(500).json({ error: messageText });
  }
}
