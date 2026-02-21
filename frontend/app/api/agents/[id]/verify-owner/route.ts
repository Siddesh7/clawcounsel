import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isINFTOwner } from "@/lib/inft";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;

  if (!walletAddress || typeof walletAddress !== "string") {
    return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!agent.nftTokenId) {
    const isDeployer = agent.walletAddress?.toLowerCase() === walletAddress.toLowerCase();
    return NextResponse.json({ owner: isDeployer, method: "wallet_match" });
  }

  const tokenId = parseInt(agent.nftTokenId, 10);
  const owner = await isINFTOwner(tokenId, walletAddress as `0x${string}`);
  return NextResponse.json({ owner, method: "nft_check", tokenId });
}
