import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentOwnership } from "@/lib/verify-ownership";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;

  const [updated] = await db
    .update(agents)
    .set({
      telegramChatId: null,
      telegramChatTitle: null,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json({ agent: updated });
}
