import type { Abi } from "viem";
import agentNftAbiJson from "./abi/AgentNFT.json";

export const BACKEND_URL = "";

export const AGENT_NFT_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_0G_INFT_CONTRACT_ADDRESS ??
  process.env.AGENT_NFT_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const AGENT_NFT_ABI = agentNftAbiJson as Abi;

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const PAYMENT_AMOUNT_OG = "1";
export const PAYMENT_DECIMALS_OG = 18;

export const OG_CHAIN_ID_MAINNET = 16661;

export const OG_CHAIN = {
  id: OG_CHAIN_ID_MAINNET,
  name: "0G Mainnet",
  nativeCurrency: { decimals: 18, name: "OG", symbol: "OG" },
  rpcUrls: { default: { http: ["https://evmrpc.0g.ai"] } },
  blockExplorers: { default: { name: "0G Explorer", url: "https://chainscan.0g.ai" } },
} as const;