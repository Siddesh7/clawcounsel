import type { Abi } from "viem";
import agentNftAbiJson from "./abi/AgentNFT.json";

export const BACKEND_URL = "";

export const AGENT_NFT_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_0G_INFT_CONTRACT_ADDRESS ??
  process.env.AGENT_NFT_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const AGENT_NFT_ABI = agentNftAbiJson as Abi;

export const USDC_CONTRACT_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const USDC_AMOUNT = 0.01;
export const USDC_DECIMALS = 6;

export const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const OG_CHAIN_ID_MAINNET = 16661;