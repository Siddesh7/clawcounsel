import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN!;
const TG = (method: string) =>
  `https://api.telegram.org/bot${BOT_TOKEN()}/${method}`;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  const res = await fetch(TG("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
