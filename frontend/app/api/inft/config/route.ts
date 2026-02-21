import { NextResponse } from "next/server";
import { INFT_CONTRACT_ADDRESS, INFT_CHAIN_ID, ogChain } from "@/lib/inft";

export async function GET() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_0G_RPC_URL ??
    process.env.OG_RPC_URL ??
    "https://evmrpc.0g.ai";
  const explorerUrl =
    process.env.NEXT_PUBLIC_0G_EXPLORER_URL ?? "https://chainscan.0g.ai";

  return NextResponse.json({
    contractAddress: INFT_CONTRACT_ADDRESS,
    chainId: INFT_CHAIN_ID,
    chainName: ogChain.name,
    rpcUrl,
    explorerUrl,
  });
}
