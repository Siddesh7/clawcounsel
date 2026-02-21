import { createPublicClient, http, type Address } from "viem";
import { encodeAbiParameters, parseAbiParameters } from "viem";
import {
  AGENT_NFT_CONTRACT_ADDRESS,
  AGENT_NFT_ABI,
  OG_CHAIN_ID_MAINNET,
} from "@/lib/constants";

export const INFT_CONTRACT_ADDRESS = AGENT_NFT_CONTRACT_ADDRESS as Address;
const contractAddress = INFT_CONTRACT_ADDRESS;

const defaultRpcUrl = "https://evmrpc.0g.ai";
const rpcUrl =
  process.env.NEXT_PUBLIC_0G_RPC_URL ??
  process.env.OG_RPC_URL ??
  defaultRpcUrl;
export const INFT_CHAIN_ID = OG_CHAIN_ID_MAINNET;
export const ogChain = {
  id: INFT_CHAIN_ID,
  name: "0G Mainnet",
  nativeCurrency: { decimals: 18, name: "0G", symbol: "0G" },
  rpcUrls: { default: { http: [rpcUrl] } },
};

export type INFTTokenInfo = {
  owner: Address;
  tokenURI: string;
  dataHashes: readonly `0x${string}`[];
  dataDescriptions: readonly string[];
};

function getClient() {
  return createPublicClient({
    chain: ogChain,
    transport: http(rpcUrl),
  });
}

export type GetINFTTokenInfoResult =
  | { ok: true; info: INFTTokenInfo }
  | { ok: false; reason: "contract_not_configured" }
  | { ok: false; reason: "token_not_found"; message: string };

export async function getINFTTokenInfo(
  tokenId: number,
): Promise<INFTTokenInfo | null> {
  const result = await getINFTTokenInfoDetailed(tokenId);
  return result.ok ? result.info : null;
}

export async function getINFTTokenInfoDetailed(
  tokenId: number,
): Promise<GetINFTTokenInfoResult> {
  if (
    !contractAddress ||
    contractAddress === "0x0000000000000000000000000000000000000000"
  ) {
    return { ok: false, reason: "contract_not_configured" };
  }
  const client = getClient();
  try {
    const [owner, tokenURI, dataHashes, dataDescriptions] = await Promise.all([
      client.readContract({
        address: contractAddress,
        abi: AGENT_NFT_ABI,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      }),
      client.readContract({
        address: contractAddress,
        abi: AGENT_NFT_ABI,
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      }),
      client.readContract({
        address: contractAddress,
        abi: AGENT_NFT_ABI,
        functionName: "dataHashesOf",
        args: [BigInt(tokenId)],
      }),
      client.readContract({
        address: contractAddress,
        abi: AGENT_NFT_ABI,
        functionName: "dataDescriptionsOf",
        args: [BigInt(tokenId)],
      }),
    ]);
    return {
      ok: true,
      info: {
        owner: owner as Address,
        tokenURI: tokenURI as string,
        dataHashes: dataHashes as readonly `0x${string}`[],
        dataDescriptions: dataDescriptions as readonly string[],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (typeof console !== "undefined" && console.error) {
      console.error("[INFT] getINFTTokenInfo failed", {
        tokenId,
        contractAddress,
        chainId: INFT_CHAIN_ID,
        rpcUrl: rpcUrl.replace(/[?].*/, ""),
        error: message,
      });
    }
    return {
      ok: false,
      reason: "token_not_found",
      message: message.slice(0, 200),
    };
  }
}

export async function isINFTOwner(
  tokenId: number,
  address: Address,
): Promise<boolean> {
  const info = await getINFTTokenInfo(tokenId);
  if (!info) return false;
  return info.owner.toLowerCase() === address.toLowerCase();
}

/**
 * Build transfer/clone proofs for MockERC7857Verifier (no TEE).
 * Each proof = abi.encode(oldDataHash, newDataHash, receiver, sealedKey). sealedKey = 16 zero bytes.
 */
export function buildTransferProofs(
  currentDataHashes: readonly `0x${string}`[],
  receiver: Address,
): `0x${string}`[] {
  const sealedKey = "0x00000000000000000000000000000000" as `0x${string}`;
  return currentDataHashes.map((oldDataHash) =>
    encodeAbiParameters(
      parseAbiParameters(
        "bytes32 oldDataHash, bytes32 newDataHash, address receiver, bytes16 sealedKey",
      ),
      [oldDataHash, oldDataHash, receiver, sealedKey],
    ),
  ) as `0x${string}`[];
}

/**
 * Build transfer/clone proofs with TEE oracle attestation (StorageProofVerifier with teeOracleSigner).
 * Calls /api/inft/tee-attest per proof and returns abi.encode(oldDataHash, newDataHash, receiver, sealedKey, signature).
 * On API error (e.g. 501), returns null so caller can fall back to buildTransferProofs.
 */
export async function buildTeeTransferProofs(
  currentDataHashes: readonly `0x${string}`[],
  receiver: Address,
): Promise<`0x${string}`[] | null> {
  const sealedKey = "0x00000000000000000000000000000000" as `0x${string}`;
  const proofs: `0x${string}`[] = [];
  for (const oldDataHash of currentDataHashes) {
    const newDataHash = oldDataHash;
    const res = await fetch("/api/inft/tee-attest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldDataHash,
        newDataHash,
        receiver,
        sealedKey,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signature?: string };
    if (!data?.signature) return null;
    const sig = data.signature.startsWith("0x") ? data.signature : `0x${data.signature}`;
    proofs.push(
      encodeAbiParameters(
        parseAbiParameters(
          "bytes32 oldDataHash, bytes32 newDataHash, address receiver, bytes16 sealedKey, bytes signature",
        ),
        [oldDataHash, newDataHash, receiver, sealedKey, sig as `0x${string}`],
      ) as `0x${string}`,
    );
  }
  return proofs;
}

/** Full AgentNFT ABI – use for readContract/writeContract */
export const AGENT_NFT_WRITE_ABI = AGENT_NFT_ABI;
