import { Router } from "express";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  postChatMessage,
} from "../../controllers/chat/chat.controller.js";

export const chatRouter = Router();

chatRouter.get("/sessions", listChatSessions);
chatRouter.post("/sessions", createChatSession);
chatRouter.get("/sessions/:id", getChatSession);
chatRouter.post("/", postChatMessage);
