import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runMonitoringSweep } from "@/lib/services/agent";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  runMonitoringSweep(id).catch((e) =>
    console.error("[monitor] sweep failed:", e),
  );

  return NextResponse.json({ status: "sweep_started", agentId: id });
}
