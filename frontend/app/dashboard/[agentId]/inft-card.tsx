"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { BACKEND_URL } from "@/lib/constants";
import {
  buildTeeTransferProofs,
  AGENT_NFT_WRITE_ABI,
  INFT_CONTRACT_ADDRESS,
  ogChain,
} from "@/lib/inft";

type InftData =
  | { linked: false; agentId: string }
  | {
      linked: true;
      tokenId: number;
      owner: string;
      explorerContractUrl?: string;
      dataHashes: readonly string[];
    };

type Props = {
  agentId: string;
  agentWallet: string | null;
  inft: InftData | null;
  onUpdate: () => void;
};

export function INFTCard({ agentId, agentWallet, inft, onUpdate }: Props) {
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState("");
  const [lastMintTxUrl, setLastMintTxUrl] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const isOwner =
    inft?.linked &&
    wallets?.[0]?.address &&
    inft.owner?.toLowerCase() === wallets[0].address.toLowerCase();

  async function handleMint() {
    setMintError("");
    setMinting(true);
    try {
      const body: { to?: string } = {};
      if (authenticated && wallets?.[0]?.address) body.to = wallets[0].address;
      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/mint-inft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMintError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setLastMintTxUrl(typeof data.explorerTxUrl === "string" ? data.explorerTxUrl : null);
      onUpdate();
    } catch (e) {
      setMintError(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  }

  async function handleTransfer() {
    if (!inft?.linked || !transferTo?.trim()) return;
    setTransferError("");
    setTransferring(true);
    try {
      const wallet = wallets?.find((w) => w.walletClientType !== "privy") ?? wallets?.[0];
      if (!wallet) throw new Error("No wallet connected");
      const provider = await wallet.getEthereumProvider();
      await provider?.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${ogChain.id.toString(16)}` }],
      });
      const walletClient = createWalletClient({
        chain: { ...ogChain, rpcUrls: { default: { http: [] } } },
        transport: custom(provider as any),
        account: wallet.address as `0x${string}`,
      });
      const receiver = transferTo.trim() as `0x${string}`;
      const dataHashes = inft.dataHashes as `0x${string}`[];
      const proofs = await buildTeeTransferProofs(dataHashes, receiver);
      if (!proofs) {
        setTransferError("Transfer attestation required. Set TEE_ORACLE_PRIVATE_KEY in backend (same as mint signer for OG flow).");
        return;
      }
      await walletClient.writeContract({
        address: INFT_CONTRACT_ADDRESS,
        abi: AGENT_NFT_WRITE_ABI,
        functionName: "transfer",
        args: [transferTo.trim() as `0x${string}`, BigInt(inft.tokenId), proofs],
      });
      setTransferTo("");
      onUpdate();
    } catch (e) {
      setTransferError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setTransferring(false);
    }
  }

  if (!inft) return null;
  if (INFT_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="term-box-glow" style={{ padding: "16px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)" }}>INFT</div>
        <div style={{ fontSize: 13, color: "var(--term-green-mid)", marginTop: 8 }}>▸ INFT not configured</div>
      </div>
    );
  }

  return (
    <div className="term-box-glow" style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 12 }}>INFT</div>
      {inft.linked ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "8px 16px", fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: "var(--term-green-mid)" }}>TOKEN</span>
            <span style={{ color: "var(--term-green)" }}>#{inft.tokenId}</span>
            <span style={{ color: "var(--term-green-mid)" }}>OWNER</span>
            <span style={{ fontSize: 11 }}>{inft.owner.slice(0, 10)}…{inft.owner.slice(-8)}</span>
          </div>
          {(lastMintTxUrl ?? inft.explorerContractUrl) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {lastMintTxUrl && (
                <a
                  href={lastMintTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--term-green)", fontSize: 12 }}
                >
                  ▸ View mint tx
                </a>
              )}
              <button
                type="button"
                className="term-btn"
                style={{ fontSize: 10, padding: "4px 12px", letterSpacing: "0.1em" }}
                onClick={() => window.open(inft.explorerContractUrl, "_blank", "noopener,noreferrer")}
              >
                <span>VIEW ON EXPLORER</span>
              </button>
            {isOwner && (
              <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input
                  className="term-input"
                  placeholder="0x… transfer to"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  style={{ width: 200, fontSize: 11, padding: "4px 8px" }}
                />
                <button
                  className="term-btn"
                  style={{ fontSize: 10, padding: "4px 10px" }}
                  onClick={handleTransfer}
                  disabled={transferring || !transferTo.trim()}
                >
                  <span>{transferring ? "…" : "TRANSFER"}</span>
                </button>
              </div>
            )}
          </div>
          )}
          {transferError && <div style={{ fontSize: 11, color: "#ff4444", marginTop: 8 }}>▸ {transferError}</div>}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: "var(--term-green-mid)", marginBottom: 10 }}>▸ No INFT linked</div>
          <button
            className="term-btn"
            style={{ fontSize: 11, padding: "6px 14px", letterSpacing: "0.1em" }}
            onClick={handleMint}
            disabled={minting}
          >
            <span>{minting ? "MINTING…" : "MINT INFT"}</span>
          </button>
          {!agentWallet && (
            <div style={{ fontSize: 11, color: "var(--term-amber)", marginTop: 6 }}>▸ Mint to deploy wallet; connect and pass ?to= or set agent wallet</div>
          )}
          {mintError && <div style={{ fontSize: 11, color: "#ff4444", marginTop: 8 }}>▸ {mintError}</div>}
        </>
      )}
    </div>
  );
}
