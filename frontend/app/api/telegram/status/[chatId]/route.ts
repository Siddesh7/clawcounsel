import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.telegramChatId, chatId));

  if (!agent) {
    return NextResponse.json({ connected: false }, { status: 404 });
  }

  return NextResponse.json({
    connected: true,
    agentId: agent.id,
    companyName: agent.companyName,
  });
}
