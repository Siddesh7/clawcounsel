import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isINFTOwner } from "@/lib/inft";

/**
 * Extracts wallet address from x-wallet-address header.
 * Returns null if missing.
 */
function getWalletFromRequest(req: NextRequest): string | null {
  return req.headers.get("x-wallet-address");
}

/**
 * Verifies that the requesting wallet owns the agent (via NFT or deployer match).
 * Returns the agent row if authorized, or a NextResponse error.
 */
export async function verifyAgentOwnership(
  req: NextRequest,
  agentId: string,
): Promise<
  | { authorized: true; agent: typeof agents.$inferSelect }
  | { authorized: false; response: NextResponse }
> {
  const wallet = getWalletFromRequest(req);
  if (!wallet) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "x-wallet-address header required" },
        { status: 401 },
      ),
    };
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Agent not found" }, { status: 404 }),
    };
  }

  if (agent.nftTokenId) {
    const tokenId = parseInt(agent.nftTokenId, 10);
    const isOwner = await isINFTOwner(tokenId, wallet as `0x${string}`);
    if (!isOwner) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Wallet does not own this agent's NFT" },
          { status: 403 },
        ),
      };
    }
  } else {
    const isDeployer = agent.walletAddress?.toLowerCase() === wallet.toLowerCase();
    if (!isDeployer) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Wallet does not match agent deployer" },
          { status: 403 },
        ),
      };
    }
  }

  return { authorized: true, agent };
}
