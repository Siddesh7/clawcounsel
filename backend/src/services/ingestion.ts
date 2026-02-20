import { db } from "../db";
import { knowledgeItems } from "../db/schema";
import { eq, and } from "drizzle-orm";

// Store a Telegram message into the knowledge base (idempotent)
export async function ingestTelegramMessage({
  agentId,
  chatId,
  chatTitle,
  userId,
  username,
  messageId,
  text,
  threadId,
}: {
  agentId:   string;
  chatId:    string;
  chatTitle: string;
  userId:    string;
  username:  string;
  messageId: string;
  text:      string;
  threadId?: string;
}) {
  const existing = await db
    .select({ id: knowledgeItems.id })
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.agentId, agentId),
        eq(knowledgeItems.messageId, messageId)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(knowledgeItems).values({
    agentId,
    source:    "telegram_message",
    chatId,
    chatTitle,
    userId,
    username,
    messageId,
    threadId:  threadId ?? null,
    content:   text,
    metadata:  {},
  });
}

// Retrieve relevant knowledge for a query (keyword search — upgrade to pgvector later)
export async function retrieveContext(agentId: string, query: string, limit = 25): Promise<string> {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const items = await db
    .select()
    .from(knowledgeItems)
    .where(eq(knowledgeItems.agentId, agentId))
    .orderBy(knowledgeItems.createdAt)
    .limit(500);

  if (items.length === 0) return "";

  const scored = items
    .map((item) => {
      const lower = item.content.toLowerCase();
      const score = keywords.filter((kw) => lower.includes(kw)).length;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const results = scored.length > 0 ? scored.map(({ item }) => item) : items.slice(-limit);

  return results
    .map((i) => `[${i.chatTitle ?? i.source} | @${i.username ?? i.userId}]: ${i.content}`)
    .join("\n");
}
