import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, kiteTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getAgentKiteAddress,
  getKiteBalance,
  kiteExplorerAddress,
  kiteExplorerTx,
} from "@/lib/services/kite";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return NextResponse.json({ error: "not found" }, { status: 404 });

  const kiteAddress = agent.kiteWalletAddress ?? getAgentKiteAddress(id);
  const [balance, recentTxns] = await Promise.all([
    getKiteBalance(kiteAddress),
    db
      .select()
      .from(kiteTransactions)
      .where(eq(kiteTransactions.agentId, id))
      .orderBy(desc(kiteTransactions.createdAt))
      .limit(5),
  ]);

  // Persist kite wallet address on first fetch
  if (!agent.kiteWalletAddress) {
    await db
      .update(agents)
      .set({ kiteWalletAddress: kiteAddress })
      .where(eq(agents.id, id));
  }

  return NextResponse.json({
    kiteAddress,
    balance: balance.toString(),
    balanceFormatted: (Number(balance) / 1e18).toFixed(6) + " KITE",
    queryCount: agent.kiteQueryCount ?? 0,
    chainId: 2368,
    network: "kite-testnet",
    explorerUrl: kiteExplorerAddress(kiteAddress),
    faucetUrl: "https://faucet.gokite.ai",
    recentTxns: recentTxns.map((t) => ({
      txHash: t.txHash,
      explorerUrl: kiteExplorerTx(t.txHash),
      direction: t.direction,
      amount: t.amount,
      createdAt: t.createdAt,
    })),
    identityProof: {
      agentId: id,
      nftTokenId: agent.nftTokenId ?? null,
      codename: agent.agentCodename ?? null,
      kiteAddress,
      chainId: 2368,
    },
  });
}
