/**
 * Mint ERC-7857 AgentNFT for a ClawCounsel agent.
 * Backend holds the mint signer; NFT is owned by the provided wallet.
 * Uses real 0G flow only: encrypt metadata → upload to 0G Storage → sign rootHash (EIP-191) → mint with (rootHash, signature).
 * Requires OG_RPC_URL, OG_STORAGE_INDEXER_URL, and OG_MINT_PRIVATE_KEY in .env.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
  encodeAbiParameters,
  parseAbiParameters,
  hexToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encryptAndUploadTo0G, isRealInftFlowConfigured } from "./ogStorage";
import { OG_CHAIN_ID_MAINNET, AGENT_NFT_CONTRACT_ADDRESS, AGENT_NFT_ABI } from "./constants";

/** Minted event args from AgentNFT (ERC-7857) */
type MintedEventArgs = { _tokenId: bigint };

function getOgChain(rpcUrl: string, chainIdOverride?: string) {
  const id = chainIdOverride
    ? parseInt(chainIdOverride, 10)
    : OG_CHAIN_ID_MAINNET;
  return {
    id,
    name: "0G Mainnet",
    nativeCurrency: { decimals: 18, name: "0G", symbol: "0G" },
    rpcUrls: { default: { http: [rpcUrl] as string[] } },
  };
}

export function isInftMintConfigured(): boolean {
  const hasAddress =
    AGENT_NFT_CONTRACT_ADDRESS &&
    AGENT_NFT_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
  return !!(hasAddress && isRealInftFlowConfigured());
}

/**
 * Mint an AgentNFT for the given agent. Owner = toAddress.
 * Returns { tokenId, txHash }.
 */
export async function mintAgentNft(
  agentId: string,
  companyId: string,
  toAddress: string,
): Promise<{ tokenId: string; txHash: string }> {
  const env = process.env as Record<string, string | undefined>;
  const rpcUrl = env.OG_RPC_URL;
  const contractAddress = AGENT_NFT_CONTRACT_ADDRESS;
  const privateKeyRaw = env.OG_MINT_PRIVATE_KEY;
  if (!rpcUrl || !contractAddress || contractAddress === "0x0000000000000000000000000000000000000000" || !privateKeyRaw) {
    throw new Error(
      "AGENT_NFT_CONTRACT_ADDRESS (or NEXT_PUBLIC_0G_INFT_CONTRACT_ADDRESS), OG_RPC_URL, and OG_MINT_PRIVATE_KEY must be set in .env",
    );
  }
  if (!isRealInftFlowConfigured()) {
    throw new Error(
      "Real 0G INFT flow required. Set OG_STORAGE_INDEXER_URL in .env (e.g. https://indexer-storage-turbo.0g.ai). Restart the dev server after changing .env.",
    );
  }

  console.log("[INFT] real 0G flow: upload to storage → sign rootHash → mint");
  const chain = getOgChain(rpcUrl, env.OG_CHAIN_ID);
  const transport = http(rpcUrl);
  const privateKey = privateKeyRaw.startsWith("0x")
    ? (privateKeyRaw as `0x${string}`)
    : (`0x${privateKeyRaw}` as `0x${string}`);
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ transport, chain, account });
  const client = createPublicClient({ transport, chain });

  const dataDescriptions = [`ClawCounsel agent ${agentId}`];

  const rootHashHex = await encryptAndUploadTo0G(agentId, companyId);
  const rootHash =
    rootHashHex.length === 66
      ? (rootHashHex as `0x${string}`)
      : (`0x${rootHashHex}` as `0x${string}`);
  let signature = await wallet.signMessage({
    message: { raw: hexToBytes(rootHash) },
  });
  // StorageProofVerifier expects exactly 65 bytes (r,s,v). Normalize 64-byte compact to 65.
  const sigBytes = (signature.length - 2) / 2;
  if (sigBytes === 64) {
    const { recoverMessageAddress } = await import("viem");
    const msg = { raw: hexToBytes(rootHash) };
    const sig27 = `${signature}1b` as `0x${string}`;
    const sig28 = `${signature}1c` as `0x${string}`;
    const addr27 = await recoverMessageAddress({ message: msg, signature: sig27 });
    signature = addr27.toLowerCase() === account.address.toLowerCase() ? sig27 : sig28;
  } else if (sigBytes !== 65) {
    throw new Error(
      `INFT: expected 65-byte signature, got ${sigBytes}. StorageProofVerifier requires (r,s,v).`,
    );
  }
  const encodedProof = encodeAbiParameters(
    parseAbiParameters("bytes32 rootHash, bytes signature"),
    [rootHash, signature],
  );
  const proofs: `0x${string}`[] = [encodedProof];
  console.log(
    "[INFT] proof signer (must equal StorageProofVerifier.signer on chain)",
    account.address,
    "proofBytes",
    encodedProof.length / 2 - 1,
  );

  const to = toAddress as Address;
  const contractAddr = contractAddress as Address;

  console.log("[INFT] calling mint(", "proofs.length=" + proofs.length, "dataDescriptions.length=" + dataDescriptions.length, "to=" + to.slice(0, 10) + "…", ")");
  const hash = await wallet.writeContract({
    address: contractAddr,
    abi: AGENT_NFT_ABI,
    functionName: "mint",
    args: [proofs, dataDescriptions, to],
  });
  console.log("[INFT] tx sent", { hash });
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("[INFT] receipt", { status: receipt.status, blockNumber: receipt.blockNumber });
  if (receipt.status !== "success") {
    console.error("[INFT] tx reverted", { hash });
    throw new Error("INFT mint transaction reverted");
  }

  const contractLogs = receipt.logs.filter(
    (l: { address: string }) =>
      l.address.toLowerCase() === contractAddr.toLowerCase(),
  );
  let mintedArgs: MintedEventArgs | null = null;
  for (const log of contractLogs) {
    try {
      const decoded = decodeEventLog({
        abi: AGENT_NFT_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "Minted") {
        mintedArgs = decoded.args as unknown as MintedEventArgs;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!mintedArgs) {
    console.error("[INFT] Minted event not found in logs", { contractLogs: contractLogs.length });
    throw new Error("INFT: Minted event not found");
  }
  const tokenId = String(mintedArgs._tokenId);
  console.log("[INFT] mint success", { tokenId, txHash: hash });
  return { tokenId, txHash: hash };
}
