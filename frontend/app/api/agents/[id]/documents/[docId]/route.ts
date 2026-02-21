import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAgentOwnership } from "@/lib/verify-ownership";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;

  const deleted = await db
    .delete(documents)
    .where(and(eq(documents.id, docId), eq(documents.agentId, id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
