/**
 * TEE Oracle attestation for ERC-7857 transfer/clone.
 * POST body: { oldDataHash, newDataHash, receiver, sealedKey } (hex strings).
 * Returns { signature } (0x-prefixed 65-byte hex). Uses TEE_ORACLE_PRIVATE_KEY (EIP-191).
 * When TEE_ORACLE_PRIVATE_KEY is not set, returns 501. Run this route inside a TEE in production.
 */

import { NextResponse } from "next/server";
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  hexToBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(request: Request) {
  const key = process.env.TEE_ORACLE_PRIVATE_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "TEE oracle not configured (TEE_ORACLE_PRIVATE_KEY)" },
      { status: 501 }
    );
  }

  let body: {
    oldDataHash: string;
    newDataHash: string;
    receiver: string;
    sealedKey: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { oldDataHash, newDataHash, receiver, sealedKey } = body;
  if (
    !oldDataHash ||
    !newDataHash ||
    !receiver ||
    !sealedKey ||
    typeof oldDataHash !== "string" ||
    typeof newDataHash !== "string" ||
    typeof receiver !== "string" ||
    typeof sealedKey !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing oldDataHash, newDataHash, receiver, or sealedKey" },
      { status: 400 }
    );
  }

  const innerHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "bytes32 oldDataHash, bytes32 newDataHash, address receiver, bytes16 sealedKey"
      ),
      [
        oldDataHash as Hex,
        newDataHash as Hex,
        receiver as Hex,
        sealedKey as Hex,
      ]
    )
  );
  const privateKey = key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex);
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signMessage({
    message: { raw: hexToBytes(innerHash) },
  });

  return NextResponse.json({
    signature: signature.startsWith("0x") ? signature : `0x${signature}`,
  });
}
