"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/constants";

type KiteData = {
  kiteAddress: string;
  balanceFormatted: string;
  queryCount: number;
  explorerUrl: string;
  faucetUrl: string;
  recentTxns: { txHash: string; explorerUrl: string; direction: string; createdAt: string }[];
  identityProof: { agentId: string; nftTokenId: string | null; codename: string | null; kiteAddress: string };
};

export function KiteCard({ agentId }: { agentId: string }) {
  const [kite, setKite] = useState<KiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    fetch(`${BACKEND_URL}/api/agents/${agentId}/kite`)
      .then((r) => r.json())
      .then(setKite)
      .catch(() => setKite(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="term-box-glow" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)" }}>
          KITE AI IDENTITY
        </div>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#00ff41", padding: "2px 8px", border: "1px solid #00ff41" }}>
          CHAIN 2368
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}><span className="cursor-blink" /></div>
      ) : !kite ? (
        <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}>▸ Kite identity unavailable</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 16px", fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: "var(--term-green-mid)" }}>IDENTITY</span>
            <a href={kite.explorerUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--term-green)", fontSize: 11, letterSpacing: "0.05em" }}>
              {kite.kiteAddress.slice(0, 12)}…{kite.kiteAddress.slice(-8)}
            </a>
            <span style={{ color: "var(--term-green-mid)" }}>BALANCE</span>
            <span style={{ fontSize: 12 }}>{kite.balanceFormatted}</span>
            <span style={{ color: "var(--term-green-mid)" }}>QUERIES</span>
            <span style={{ color: "#00ff41" }}>{kite.queryCount} on-chain</span>
            {kite.identityProof.nftTokenId && (
              <>
                <span style={{ color: "var(--term-green-mid)" }}>INFT LINK</span>
                <span style={{ fontSize: 11 }}>#{kite.identityProof.nftTokenId} (0G chain)</span>
              </>
            )}
          </div>

          {kite.recentTxns.length > 0 && (
            <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--term-green-mid)", marginBottom: 6 }}>
                RECENT ACTIVITY
              </div>
              {kite.recentTxns.map((t) => (
                <div key={t.txHash} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <a href={t.explorerUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--term-green)", fontFamily: "monospace" }}>
                    {t.txHash.slice(0, 10)}…{t.txHash.slice(-6)}
                  </a>
                  <span style={{ color: "var(--term-green-dim)" }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--term-border)", display: "flex", gap: 12, alignItems: "center" }}>
            <a href={kite.faucetUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: "var(--term-green-mid)", letterSpacing: "0.1em" }}>
              ▸ FAUCET
            </a>
            <a href={kite.explorerUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: "var(--term-green-mid)", letterSpacing: "0.1em" }}>
              ▸ KITESCAN
            </a>
            <span style={{ fontSize: 10, color: "var(--term-green-dim)", marginLeft: "auto", letterSpacing: "0.08em" }}>
              x402 COMPUTE API: /api/agents/{agentId}/compute
            </span>
          </div>
        </>
      )}
    </div>
  );
}
