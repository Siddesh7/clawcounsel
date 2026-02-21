import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, onboardingData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mintAgentNft, isInftMintConfigured } from "@/lib/inftMint";

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

  if (agent && isInftMintConfigured() && walletAddress && typeof walletAddress === "string" && walletAddress.startsWith("0x")) {
    try {
      console.log("[INFT] deploy: minting for new agent", { agentId: agent.id, wallet: walletAddress.slice(0, 10) + "…" });
      const { tokenId } = await mintAgentNft(agent.id, agent.companyId, walletAddress);
      await db
        .update(agents)
        .set({ nftTokenId: tokenId, updatedAt: new Date() })
        .where(eq(agents.id, agent.id));
      console.log("[INFT] deploy: mint ok", { agentId: agent.id, tokenId });
      const [updated] = await db.select().from(agents).where(eq(agents.id, agent.id));
      return NextResponse.json({ agent: updated ?? agent }, { status: 201 });
    } catch (e) {
      console.error("[INFT] deploy: mint failed (agent created, mint later from dashboard)", e instanceof Error ? e.message : e);
      // Mint failed; agent is still created, user can mint from dashboard
    }
  } else {
    if (agent && !isInftMintConfigured()) console.log("[INFT] deploy: skip mint (not configured)");
    else if (agent && (!walletAddress || !walletAddress.startsWith("0x"))) console.log("[INFT] deploy: skip mint (no wallet address)");
  }

  return NextResponse.json({ agent }, { status: 201 });
}
