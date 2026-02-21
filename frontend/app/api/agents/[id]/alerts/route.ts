import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.agentId, id))
    .orderBy(desc(alerts.createdAt));
  return NextResponse.json({ alerts: rows });
}
