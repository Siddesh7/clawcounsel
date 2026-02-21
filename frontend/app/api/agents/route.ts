import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, onboardingData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(agents)
    .leftJoin(onboardingData, eq(onboardingData.agentId, agents.id));

  return NextResponse.json({
    agents: rows.map((r) => ({
      ...r.agents,
      onboarding: r.onboarding_data ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { companyName, companyId, walletAddress, paymentTxHash } =
    await req.json();

  if (!companyName || !companyId) {
    return NextResponse.json(
      { error: "companyName and companyId are required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select()
    .from(agents)
    .where(eq(agents.companyId, companyId));

  if (existing) {
    return NextResponse.json(
      {
        error: `An agent with company ID "${companyId}" already exists.`,
        agentId: existing.id,
      },
      { status: 409 },
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      companyName,
      companyId,
      walletAddress: walletAddress || null,
      paymentTxHash: paymentTxHash || null,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ agent }, { status: 201 });
}
