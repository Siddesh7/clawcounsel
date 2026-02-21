import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mintAgentNft, isInftMintConfigured } from "@/lib/inftMint";
import { verifyAgentOwnership } from "@/lib/verify-ownership";
import {
  INFT_CONTRACT_ADDRESS,
  INFT_CHAIN_ID,
} from "@/lib/inft";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const check = await verifyAgentOwnership(req, id);
  if (!check.authorized) return check.response;
  const agent = check.agent;

  if (!isInftMintConfigured()) {
    return NextResponse.json(
      {
        error:
          "INFT mint not configured. Set in .env: AGENT_NFT_CONTRACT_ADDRESS, OG_RPC_URL, OG_MINT_PRIVATE_KEY, and OG_STORAGE_INDEXER_URL (e.g. https://indexer-storage-turbo.0g.ai).",
      },
      { status: 503 },
    );
  }
  if (agent.nftTokenId) {
    return NextResponse.json(
      { error: "Agent already has an INFT linked" },
      { status: 409 },
    );
  }

  let body: { to?: string } | null = null;
  try {
    body = await req.json().catch(() => null);
  } catch {
    // no body
  }
  const to = body?.to ?? agent.walletAddress ?? null;
  if (!to || typeof to !== "string" || !to.startsWith("0x")) {
    return NextResponse.json(
      { error: "walletAddress required for mint (set on agent or pass body.to)" },
      { status: 400 },
    );
  }

  console.log("[INFT] mint-inft POST", { agentId: id, to: to.slice(0, 10) + "…" });
  try {
    const { tokenId, txHash } = await mintAgentNft(
      agent.id,
      agent.companyId,
      to,
    );
    await db
      .update(agents)
      .set({ nftTokenId: tokenId, updatedAt: new Date() })
      .where(eq(agents.id, id));

    console.log("[INFT] mint-inft success", { agentId: id, tokenId, txHash });
    const explorerUrl =
      process.env.NEXT_PUBLIC_0G_EXPLORER_URL ?? "https://chainscan.0g.ai";
    return NextResponse.json({
      tokenId: parseInt(tokenId, 10),
      txHash,
      owner: to,
      contractAddress: INFT_CONTRACT_ADDRESS,
      chainId: INFT_CHAIN_ID,
      explorerContractUrl: `${explorerUrl}/token/${INFT_CONTRACT_ADDRESS}`,
      explorerTxUrl: `${explorerUrl}/tx/${txHash}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mint failed";
    console.error("[INFT] mint-inft failed", { agentId: id, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
