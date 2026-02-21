/**
 * Encrypt agent metadata and upload to 0G Storage. Returns Merkle root hash (hex).
 * Used for real ERC-7857 flow: on-chain we commit to this rootHash via StorageProofVerifier.
 * Server-only: uses node:crypto and node:fs.
 */

import { randomBytes, createCipheriv } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function encrypt(
  payload: Uint8Array,
  key: Buffer,
): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: encrypted, iv, tag };
}

export function isRealInftFlowConfigured(): boolean {
  const env = process.env;
  return !!(env.OG_RPC_URL && env.OG_MINT_PRIVATE_KEY);
}

const INDEXER_MAINNET = "https://indexer-storage-turbo.0g.ai";

export async function encryptAndUploadTo0G(
  agentId: string,
  companyId: string,
): Promise<string> {
  const env = process.env as Record<string, string | undefined>;
  const rpcUrl = env.OG_RPC_URL;
  const privateKey = env.OG_MINT_PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    throw new Error(
      "OG_RPC_URL and OG_MINT_PRIVATE_KEY are required for 0G Storage upload",
    );
  }
  const indexerUrl = env.OG_STORAGE_INDEXER_URL ?? INDEXER_MAINNET;

  console.log("[INFT] 0G Storage: encryptAndUpload start", { agentId, companyId });
  const key = randomBytes(KEY_LEN);
  const payload = Buffer.from(
    JSON.stringify({
      agentId,
      companyId,
      createdAt: new Date().toISOString(),
    }),
    "utf-8",
  );
  const { ciphertext, iv, tag } = encrypt(new Uint8Array(payload), key);
  const blob = Buffer.concat([iv, tag, ciphertext]);

  const tmpPath = join(tmpdir(), `inft-${agentId}-${Date.now()}.bin`);
  await writeFile(tmpPath, blob);

  try {
    const { Indexer, ZgFile } = await import("@0glabs/0g-ts-sdk");
    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const indexerInstance = new Indexer(indexerUrl);

    const file = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr != null) {
      console.error("[INFT] 0G Storage: merkle tree error", treeErr);
      throw new Error(`Merkle tree: ${treeErr}`);
    }
    console.log("[INFT] 0G Storage: merkle tree ok");

    const signerAddress = await signer.getAddress();
    console.log("[INFT] 0G Storage: upload signer", signerAddress, "(must have 0G tokens for storage fee)");
    const [tx, uploadErr] = await indexerInstance.upload(
      file,
      rpcUrl,
      signer as never,
    );
    await file.close();
    if (uploadErr != null) {
      console.error("[INFT] 0G Storage: upload error", uploadErr);
      throw new Error(`Upload: ${uploadErr}`);
    }
    console.log("[INFT] 0G Storage: upload ok");

    const rootHashHex =
      (tx as { rootHash?: string })?.rootHash ?? tree?.rootHash?.() ?? null;
    if (!rootHashHex) {
      console.error("[INFT] 0G Storage: no root hash in tx/tree");
      throw new Error("No root hash");
    }
    const rootHash = rootHashHex.startsWith("0x")
      ? rootHashHex
      : `0x${rootHashHex}`;
    console.log("[INFT] 0G Storage: done", { rootHash: rootHash.slice(0, 18) + "…" });
    return rootHash;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
