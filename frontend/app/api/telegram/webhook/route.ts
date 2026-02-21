import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ingestTelegramMessage } from "@/lib/services/ingestion";
import { askAgent } from "@/lib/services/agent";
import { extractAndStore } from "@/lib/services/pdf";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const TG = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN()}/${method}`;

async function send(
  chatId: number | string,
  text: string,
  replyToMessageId?: number,
) {
  const res = await fetch(TG("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      reply_to_message_id: replyToMessageId,
    }),
  });

  if (!res.ok) {
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
}

async function downloadTelegramFile(fileId: string): Promise<Buffer | null> {
  const res = await fetch(TG("getFile"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const data = await res.json();
  if (!data.ok || !data.result?.file_path) return null;

  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN()}/${data.result.file_path}`;
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) return null;

  return Buffer.from(await fileRes.arrayBuffer());
}

async function handleDocument(
  agentId: string,
  message: Record<string, any>,
  chatId: number,
) {
  const doc = message.document;
  if (!doc?.file_id) return;

  const filename: string = doc.file_name ?? "document";
  const supported = /\.(pdf|txt|md|doc|docx)$/i.test(filename);
  if (!supported) return;

  const codename =
    (
      await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    )[0]?.agentCodename ?? "Agent";

  await send(chatId, `_${codename} processing ${filename}..._`, message.message_id);

  try {
    const buffer = await downloadTelegramFile(doc.file_id);
    if (!buffer) {
      await send(chatId, `Could not download _${filename}_.`, message.message_id);
      return;
    }

    const result = await extractAndStore(agentId, buffer, filename, "telegram");
    if (result) {
      await send(
        chatId,
        `*${filename}* ingested — ${result.chunks} sections extracted via ${result.method}.\n\nYou can now /ask questions about this document.`,
        message.message_id,
      );
    } else {
      await send(
        chatId,
        `Could not extract text from _${filename}_. Try uploading a text-based PDF.`,
        message.message_id,
      );
    }
  } catch (e) {
    console.error("[telegram] document processing error:", e);
    await send(chatId, `Error processing _${filename}_.`, message.message_id);
  }
}

export async function POST(req: NextRequest) {
  const update = await req.json();
  const message = update?.message;
  if (!message) return NextResponse.json({ ok: true });

  const hasText = !!message.text;
  const hasDocument = !!message.document;
  if (!hasText && !hasDocument) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const chatTitle =
    message.chat.title ?? message.chat.username ?? "DM";
  const userId = String(message.from?.id ?? "unknown");
  const username =
    message.from?.username ?? message.from?.first_name ?? userId;
  const text = (message.text ?? message.caption ?? "") as string;
  const messageId = String(message.message_id);
  const threadId = message.message_thread_id
    ? String(message.message_thread_id)
    : undefined;

  if (hasText && text.startsWith("/connect")) {
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

    const codename = agent.agentCodename ?? "ClawCounsel";
    const tagline = agent.agentTagline ? `\n_${agent.agentTagline}_` : "";
    const specialty = agent.agentSpecialty
      ? `\nSpecialty: *${agent.agentSpecialty}*`
      : "";

    await send(
      chatId,
      `*${codename}* online. Connected to *${agent.companyName}*.${tagline}${specialty}\n\nI'll ingest every message here and build your legal knowledge base.\n\nAsk me anything — /ask or tag me directly.`,
    );

    return NextResponse.json({ ok: true });
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.telegramChatId, String(chatId)));

  if (!agent) return NextResponse.json({ ok: true });

  if (hasDocument) {
    await handleDocument(agent.id, message, chatId);
    return NextResponse.json({ ok: true });
  }

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

    const loadingName = agent.agentCodename ?? "Agent";
    await send(chatId, `_${loadingName} scanning documents..._`, message.message_id);

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
