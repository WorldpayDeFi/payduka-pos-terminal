import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const openaiConversationsTable = pgTable("openai_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const openaiMessagesTable = pgTable("openai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => openaiConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant" | "system"
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOpenaiConversationSchema = createInsertSchema(openaiConversationsTable).omit({ id: true, createdAt: true });
export type InsertOpenaiConversation = z.infer<typeof insertOpenaiConversationSchema>;
export type OpenaiConversation = typeof openaiConversationsTable.$inferSelect;

export const insertOpenaiMessageSchema = createInsertSchema(openaiMessagesTable).omit({ id: true, createdAt: true });
export type InsertOpenaiMessage = z.infer<typeof insertOpenaiMessageSchema>;
export type OpenaiMessage = typeof openaiMessagesTable.$inferSelect;
