import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
  encodePacked,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const kiteTestnet = defineChain({
  id: 2368,
  name: "Kite AI Testnet",
  nativeCurrency: { name: "KITE", symbol: "KITE", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.KITE_RPC_URL ?? "https://rpc-testnet.gokite.ai/"] },
  },
  blockExplorers: {
    default: { name: "KiteScan", url: "https://testnet.kitescan.ai" },
  },
});

export const kitePublicClient = createPublicClient({
  chain: kiteTestnet,
  transport: http(),
});

/** Derive a deterministic private key for an agent from the master secret */
export function deriveAgentPrivateKey(agentId: string): `0x${string}` {
  const secret = process.env.KITE_AGENT_SECRET ?? "clawcounsel-kite-default";
  return keccak256(encodePacked(["string", "string"], [secret, agentId]));
}

export function getAgentKiteAddress(agentId: string): string {
  return privateKeyToAccount(deriveAgentPrivateKey(agentId)).address;
}

export async function getKiteBalance(address: string): Promise<bigint> {
  try {
    return await kitePublicClient.getBalance({ address: address as `0x${string}` });
  } catch {
    return BigInt(0);
  }
}

export function kiteExplorerTx(txHash: string): string {
  return `https://testnet.kitescan.ai/tx/${txHash}`;
}

export function kiteExplorerAddress(address: string): string {
  return `https://testnet.kitescan.ai/address/${address}`;
}

/**
 * Treasury wallet sends a micropayment to the agent's Kite address, recording
 * the query on-chain. Returns txHash or null if treasury is not configured.
 */
export async function recordQueryOnChain(agentKiteAddress: string): Promise<string | null> {
  const treasuryKey = process.env.KITE_TREASURY_PRIVATE_KEY;
  if (!treasuryKey) return null;

  try {
    const treasury = privateKeyToAccount(treasuryKey as `0x${string}`);
    const walletClient = createWalletClient({
      account: treasury,
      chain: kiteTestnet,
      transport: http(),
    });

    return await walletClient.sendTransaction({
      to: agentKiteAddress as `0x${string}`,
      value: parseEther("0.0001"),
    });
  } catch (err) {
    console.error("[kite] recordQueryOnChain failed:", err);
    return null;
  }
}

/**
 * Verify a Kite testnet payment: confirms tx is successful, sent to expectedTo,
 * and value >= minAmount.
 */
export async function verifyKitePayment(
  txHash: string,
  expectedTo: string,
  minAmount: bigint,
): Promise<boolean> {
  try {
    const [receipt, tx] = await Promise.all([
      kitePublicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }),
      kitePublicClient.getTransaction({ hash: txHash as `0x${string}` }),
    ]);
    return (
      receipt.status === "success" &&
      tx.to?.toLowerCase() === expectedTo.toLowerCase() &&
      tx.value >= minAmount
    );
  } catch {
    return false;
  }
}
