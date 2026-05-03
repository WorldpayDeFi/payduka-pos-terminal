import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { openaiConversationsTable, openaiMessagesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  DeleteOpenaiConversationParams,
  GetOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageBody,
  SendOpenaiMessageParams,
  ListOpenaiConversationsResponse,
  GetOpenaiConversationResponse,
  ListOpenaiMessagesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are PayDuka AI — a smart merchant business advisor for the PayDuka Point of Sale system.
You help merchants understand their sales performance, stock levels, and growth strategies.
You have access to real sales data through this conversation. Be concise, data-driven, and actionable.
Always provide specific recommendations tailored to a retail merchant in emerging markets.
When discussing numbers, format them clearly. Focus on practical advice that drives revenue and stock efficiency.`;

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const rows = await db.select().from(openaiConversationsTable).orderBy(openaiConversationsTable.createdAt);
  res.json(ListOpenaiConversationsResponse.parse(rows));
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(openaiConversationsTable).values({ title: parsed.data.title }).returning();
  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(openaiConversationsTable).where(eq(openaiConversationsTable.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await db.select().from(openaiMessagesTable).where(eq(openaiMessagesTable.conversationId, conv.id)).orderBy(openaiMessagesTable.createdAt);
  res.json(GetOpenaiConversationResponse.parse({ ...conv, messages }));
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.delete(openaiConversationsTable).where(eq(openaiConversationsTable.id, params.data.id)).returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const messages = await db.select().from(openaiMessagesTable).where(eq(openaiMessagesTable.conversationId, params.data.id)).orderBy(openaiMessagesTable.createdAt);
  res.json(ListOpenaiMessagesResponse.parse(messages));
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.select().from(openaiConversationsTable).where(eq(openaiConversationsTable.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(openaiMessagesTable).values({
    conversationId: conv.id,
    role: "user",
    content: parsed.data.content,
  });

  // Load history
  const history = await db.select().from(openaiMessagesTable).where(eq(openaiMessagesTable.conversationId, conv.id)).orderBy(openaiMessagesTable.createdAt);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  // SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (content) {
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  // Save assistant message
  await db.insert(openaiMessagesTable).values({
    conversationId: conv.id,
    role: "assistant",
    content: fullContent,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
