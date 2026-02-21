import { db } from "@/lib/db";
import { knowledgeItems, documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
  agentId: string;
  chatId: string;
  chatTitle: string;
  userId: string;
  username: string;
  messageId: string;
  text: string;
  threadId?: string;
}) {
  const existing = await db
    .select({ id: knowledgeItems.id })
    .from(knowledgeItems)
    .where(
      and(
        eq(knowledgeItems.agentId, agentId),
        eq(knowledgeItems.messageId, messageId),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(knowledgeItems).values({
    agentId,
    source: "telegram_message",
    chatId,
    chatTitle,
    userId,
    username,
    messageId,
    threadId: threadId ?? null,
    content: text,
    metadata: {},
  });
}

export async function retrieveDocumentContext(
  agentId: string,
  query: string,
  maxChars = 12000,
): Promise<string> {
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.agentId, agentId));

  if (docs.length === 0) return "";

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const chunks: Array<{ source: string; text: string; score: number }> = [];

  for (const doc of docs) {
    if (!doc.content) continue;
    const paragraphs = doc.content.split(/\n{2,}/);

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length < 20) continue;

      const lower = trimmed.toLowerCase();
      const score = keywords.reduce((s, kw) => {
        const matches = lower.split(kw).length - 1;
        return s + matches;
      }, 0);

      chunks.push({ source: doc.name, text: trimmed, score });
    }
  }

  chunks.sort((a, b) => b.score - a.score);
  const topChunks = chunks.filter((c) => c.score > 0).slice(0, 30);

  if (topChunks.length < 5) {
    const fallback = chunks
      .filter((c) => !topChunks.includes(c))
      .slice(0, 10);
    topChunks.push(...fallback);
  }

  let output = "";
  let currentDoc = "";
  for (const chunk of topChunks) {
    if (output.length + chunk.text.length > maxChars) break;
    if (chunk.source !== currentDoc) {
      currentDoc = chunk.source;
      output += `\n--- ${chunk.source} ---\n`;
    }
    output += chunk.text + "\n\n";
  }

  return output.trim();
}

export async function retrieveContext(
  agentId: string,
  query: string,
  limit = 25,
): Promise<string> {
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

  const results =
    scored.length > 0
      ? scored.map(({ item }) => item)
      : items.slice(-limit);

  return results
    .map(
      (i) =>
        `[${i.chatTitle ?? i.source} | @${i.username ?? i.userId}]: ${i.content}`,
    )
    .join("\n");
}

export async function listDocuments(agentId: string) {
  return db
    .select({ id: documents.id, name: documents.name, type: documents.type })
    .from(documents)
    .where(eq(documents.agentId, agentId));
}
