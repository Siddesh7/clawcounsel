import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ingestTelegramMessage } from "@/lib/services/ingestion";
import { askAgent } from "@/lib/services/agent";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const TG = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN()}/${method}`;

async function send(
  chatId: number | string,
  text: string,
  replyToMessageId?: number,
) {
  await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyToMessageId,
    }),
  });
}

export async function POST(req: NextRequest) {
  const update = await req.json();
  const message = update?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const chatTitle =
    message.chat.title ?? message.chat.username ?? "DM";
  const userId = String(message.from?.id ?? "unknown");
  const username =
    message.from?.username ?? message.from?.first_name ?? userId;
  const text = message.text as string;
  const messageId = String(message.message_id);
  const threadId = message.message_thread_id
    ? String(message.message_thread_id)
    : undefined;

  if (text.startsWith("/connect")) {
    const agentId = text.split(" ")[1]?.trim();
    if (!agentId) {
      await send(
        chatId,
        "Usage: /connect {agentId}\n\nGet your agent ID from the ClawCounsel dashboard.",
      );
      return NextResponse.json({ ok: true });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId));
    if (!agent) {
      await send(
        chatId,
        `No agent found with ID: ${agentId}\n\nDouble-check the ID on your dashboard.`,
      );
      return NextResponse.json({ ok: true });
    }

    if (agent.telegramChatId && agent.telegramChatId !== String(chatId)) {
      await send(chatId, "This agent is already connected to a different group.");
      return NextResponse.json({ ok: true });
    }

    await db
      .update(agents)
      .set({
        telegramChatId: String(chatId),
        telegramChatTitle: chatTitle,
        status: "active",
      })
      .where(eq(agents.id, agentId));

    await send(
      chatId,
      `OpenClaw is now connected to ${agent.companyName}.\n\nI'll learn from every message in this group and build a legal knowledge base for your company.\n\nAsk me anything by tagging me or using /ask — I'll answer based on your company's contracts, policies, and communications.`,
    );

    return NextResponse.json({ ok: true });
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.telegramChatId, String(chatId)));

  if (!agent) return NextResponse.json({ ok: true });

  await ingestTelegramMessage({
    agentId: agent.id,
    chatId: String(chatId),
    chatTitle,
    userId,
    username,
    messageId,
    text,
    threadId,
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const isMention = text.includes(`@${botUsername}`);
  const isAskCmd = text.startsWith("/ask");

  if (isAskCmd || isMention) {
    const question = text
      .replace(/^\/ask\s*/i, "")
      .replace(new RegExp(`@${botUsername}`, "g"), "")
      .trim();

    if (!question) {
      await send(
        chatId,
        "Ask me a legal question: /ask Is our NDA with Acme Corp still valid?",
        message.message_id,
      );
      return NextResponse.json({ ok: true });
    }

    await send(chatId, "Analyzing...", message.message_id);

    try {
      const answer = await askAgent(
        agent.id,
        userId,
        String(chatId),
        question,
      );
      await send(chatId, answer, message.message_id);
    } catch (e) {
      console.error("[agent] error:", e);
      await send(
        chatId,
        "Error processing your question. Please try again.",
        message.message_id,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
