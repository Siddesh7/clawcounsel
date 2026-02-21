import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getINFTTokenInfo,
  isINFTOwner,
  INFT_CONTRACT_ADDRESS,
  INFT_CHAIN_ID,
} from "@/lib/inft";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  const tokenIdRaw = agent.nftTokenId;
  if (tokenIdRaw == null || tokenIdRaw === "") {
    return NextResponse.json({ linked: false, agentId: id });
  }
  const tokenId = parseInt(tokenIdRaw, 10);
  if (Number.isNaN(tokenId)) {
    return NextResponse.json(
      { error: "Invalid nftTokenId stored" },
      { status: 500 },
    );
  }
  const info = await getINFTTokenInfo(tokenId);
  if (!info) {
    return NextResponse.json(
      { error: "INFT token not found or contract not configured" },
      { status: 404 },
    );
  }
  const explorerUrl =
    process.env.NEXT_PUBLIC_0G_EXPLORER_URL ?? "https://chainscan.0g.ai";
  return NextResponse.json({
    linked: true,
    agentId: id,
    tokenId,
    contractAddress: INFT_CONTRACT_ADDRESS,
    chainId: INFT_CHAIN_ID,
    owner: info.owner,
    tokenURI: info.tokenURI,
    dataHashes: info.dataHashes,
    dataDescriptions: info.dataDescriptions,
    explorerContractUrl: `${explorerUrl}/token/${INFT_CONTRACT_ADDRESS}`,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { tokenId: number; walletAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const { tokenId, walletAddress } = body;
  if (tokenId == null || typeof tokenId !== "number" || tokenId < 0) {
    return NextResponse.json(
      { error: "tokenId (number) is required" },
      { status: 400 },
    );
  }
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  if (
    INFT_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return NextResponse.json(
      {
        error:
          "INFT contract not configured (NEXT_PUBLIC_0G_INFT_CONTRACT_ADDRESS or AGENT_NFT_CONTRACT_ADDRESS)",
      },
      { status: 503 },
    );
  }
  if (walletAddress) {
    const owned = await isINFTOwner(
      tokenId,
      walletAddress as `0x${string}`,
    );
    if (!owned) {
      return NextResponse.json(
        { error: "Token is not owned by the given walletAddress" },
        { status: 403 },
      );
    }
  }
  await db
    .update(agents)
    .set({ nftTokenId: String(tokenId), updatedAt: new Date() })
    .where(eq(agents.id, id));
  const explorerUrl =
    process.env.NEXT_PUBLIC_0G_EXPLORER_URL ?? "https://chainscan.0g.ai";
  return NextResponse.json({
    ok: true,
    agentId: id,
    tokenId,
    contractAddress: INFT_CONTRACT_ADDRESS,
    chainId: INFT_CHAIN_ID,
    explorerContractUrl: `${explorerUrl}/token/${INFT_CONTRACT_ADDRESS}`,
  });
}
