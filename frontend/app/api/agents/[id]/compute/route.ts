import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getAgentKiteAddress,
  verifyKitePayment,
  kiteExplorerTx,
} from "@/lib/services/kite";
import { parseEther } from "viem";

const QUERY_PRICE = parseEther("0.001") as bigint; // 0.001 KITE per query

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "X-Payment, Content-Type",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const agentKiteAddress = agent.kiteWalletAddress ?? getAgentKiteAddress(id);
  const question = req.nextUrl.searchParams.get("q");

  const paymentTxHash = req.headers.get("X-Payment");
  if (paymentTxHash) {
    return handlePaidRequest(id, agentKiteAddress, question, paymentTxHash);
  }

  // Return HTTP 402 with x402-style payment instructions
  const paymentRequired = {
    version: "x402-kite/1",
    chainId: 2368,
    network: "kite-testnet",
    rpc: "https://rpc-testnet.gokite.ai/",
    payTo: agentKiteAddress,
    amount: "0.001",
    token: "KITE",
    description: `Query ClawCounsel agent: ${agent.agentCodename ?? agent.companyName}`,
    agent: {
      id: agent.id,
      codename: agent.agentCodename,
      nftTokenId: agent.nftTokenId,
      identity: agentKiteAddress,
    },
    retry: {
      method: "GET",
      header: "X-Payment: <txHash>",
      example: `curl -H "X-Payment: 0x..." "${req.nextUrl.origin}/api/agents/${id}/compute?q=your+question"`,
    },
  };

  return NextResponse.json(
    {
      error: "Payment Required",
      instructions: "Send 0.001 KITE to payTo on Kite AI Testnet, then retry with X-Payment header containing the txHash.",
      faucet: "https://faucet.gokite.ai",
      payment: paymentRequired,
    },
    {
      status: 402,
      headers: {
        "X-Payment-Required": Buffer.from(JSON.stringify(paymentRequired)).toString("base64"),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "X-Payment-Required",
      },
    },
  );
}

async function handlePaidRequest(
  agentId: string,
  agentKiteAddress: string,
  question: string | null,
  paymentTxHash: string,
): Promise<NextResponse> {
  if (!question) {
    return NextResponse.json({ error: "missing ?q= query parameter" }, { status: 400 });
  }

  const valid = await verifyKitePayment(paymentTxHash, agentKiteAddress, QUERY_PRICE);
  if (!valid) {
    return NextResponse.json(
      { error: "Payment verification failed. Ensure txHash is confirmed on Kite testnet and paid correct amount to agent address.", txHash: paymentTxHash },
      { status: 402 },
    );
  }

  const { askAgent } = await import("@/lib/services/agent");
  const answer = await askAgent(agentId, "x402-client", "external", question);

  const paymentResponse = {
    txHash: paymentTxHash,
    explorerUrl: kiteExplorerTx(paymentTxHash),
    paidTo: agentKiteAddress,
    chainId: 2368,
    settled: true,
  };

  return NextResponse.json(
    { answer, payment: paymentResponse },
    {
      status: 200,
      headers: {
        "X-Payment-Response": Buffer.from(JSON.stringify(paymentResponse)).toString("base64"),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "X-Payment-Response",
      },
    },
  );
}
