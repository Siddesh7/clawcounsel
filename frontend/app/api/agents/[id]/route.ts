import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentOwnership } from "@/lib/verify-ownership";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json({ agent });
}

const ALLOWED_FIELDS = new Set([
  "companyName",
  "agentCodename",
  "agentSpecialty",
  "agentTone",
  "agentTagline",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;

  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, val] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key) && typeof val === "string") {
      updates[key] = val;
    }
  }

  const [updated] = await db
    .update(agents)
    .set(updates)
    .where(eq(agents.id, id))
    .returning();

  return NextResponse.json({ agent: updated });
}
