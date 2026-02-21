"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { BACKEND_URL } from "@/lib/constants";
import { INFTCard } from "./inft-card";
import { OwnerControls } from "./owner-controls";

type Alert = {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
};

const CONTEXT_LABELS: Record<string, string> = {
  industry: "INDUSTRY",
  documentTypes: "DOCUMENT TYPES",
  legalConcerns: "LEGAL CONCERNS",
  activeContracts: "ACTIVE CONTRACTS",
  monitoringPriorities: "MONITORING",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff4444",
  high: "var(--term-amber)",
  medium: "#ffdd44",
  low: "var(--term-green-mid)",
};

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--term-border)" }}>
      <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--term-green-mid)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--term-green)", lineHeight: 1.6 }}>{value}</span>
    </div>
  );
}

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [agent, setAgent] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inft, setInft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState<boolean | null>(null);

  const wallet = wallets.find((w) => w.walletClientType !== "privy") ?? wallets[0];

  const fetchInft = useCallback(() => {
    if (!agentId) return;
    fetch(`${BACKEND_URL}/api/agents/${agentId}/inft`)
      .then((r) => r.json())
      .then(setInft)
      .catch(() => setInft(null));
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    Promise.all([
      fetch(`${BACKEND_URL}/api/agents/${agentId}`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/agents/${agentId}/alerts`).then((r) => r.json()),
    ]).then(([a, o, al]) => {
      setAgent(a.agent);
      setOnboarding(o.onboarding);
      setAlerts(al.alerts ?? []);
    }).finally(() => setLoading(false));
    fetchInft();
  }, [agentId, fetchInft]);

  useEffect(() => {
    if (!agentId || !wallet?.address) {
      setOwnerVerified(null);
      return;
    }
    fetch(`${BACKEND_URL}/api/agents/${agentId}/verify-owner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: wallet.address }),
    })
      .then((r) => r.json())
      .then((d) => setOwnerVerified(d.owner === true))
      .catch(() => setOwnerVerified(false));
  }, [agentId, wallet?.address]);

  const ownerHeaders: HeadersInit = wallet?.address
    ? { "x-wallet-address": wallet.address }
    : {};

  async function triggerSweep() {
    setSweeping(true);
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/monitor`, {
      method: "POST",
      headers: ownerHeaders,
    });
    setTimeout(async () => {
      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/alerts`).then((r) => r.json());
      setAlerts(res.alerts ?? []);
      setSweeping(false);
    }, 5000);
  }

  if (ready && !authenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace", gap: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-amber)" }}>ACCESS DENIED</div>
        <div style={{ fontSize: 13, color: "var(--term-green-mid)", textAlign: "center", maxWidth: 400 }}>
          Connect your wallet to verify ownership of this agent.
        </div>
        <button className="term-btn" style={{ fontSize: 13, padding: "10px 32px", letterSpacing: "0.15em" }} onClick={() => login()}>
          <span>[ CONNECT WALLET ]</span>
        </button>
      </main>
    );
  }

  if (authenticated && ownerVerified === null) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace", gap: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)" }}>VERIFYING OWNERSHIP</div>
        <div style={{ fontSize: 13, color: "var(--term-green-dim)" }}>Checking NFT ownership on-chain<span className="cursor-blink" /></div>
      </main>
    );
  }

  if (ownerVerified === false) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace", gap: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#ff4444" }}>ACCESS DENIED</div>
        <div style={{ fontSize: 13, color: "var(--term-green-mid)", textAlign: "center", maxWidth: 440 }}>
          Wallet <span style={{ color: "var(--term-green)" }}>{wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}</span> does not own this agent&apos;s NFT.
        </div>
        <div style={{ fontSize: 11, color: "var(--term-green-dim)", textAlign: "center", maxWidth: 440 }}>
          Only the NFT holder can access the agent dashboard and configure the agent.
        </div>
        <Link href="/dashboard">
          <button className="term-btn" style={{ fontSize: 12, padding: "8px 24px" }}><span>← BACK TO AGENTS</span></button>
        </Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>
          <Link href="/dashboard" style={{ color: "var(--term-bg)", textDecoration: "none", marginRight: 16 }}>← AGENTS</Link>
          /dashboard/{agentId}
        </span>
        <span style={{ display: "flex", gap: 20 }}>
          <span>{agent?.agentCodename ?? agent?.companyName ?? "—"}</span>
          <span style={{ color: agent?.telegramChatId ? "#00ff41" : "var(--term-amber)" }}>
            {agent?.telegramChatId ? "● TELEGRAM" : "○ TELEGRAM PENDING"}
          </span>
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <div className="font-display term-glow-static" style={{ fontSize: 36, letterSpacing: "0.05em", lineHeight: 1 }}>
            {agent?.agentCodename ?? agent?.companyName ?? "CLAWCOUNSEL"}
          </div>
          {agent?.agentCodename && (
            <div style={{ fontSize: 13, color: "var(--term-green)", letterSpacing: "0.1em", marginTop: 6 }}>
              {agent.companyName}
            </div>
          )}
          {agent?.agentTagline && (
            <div style={{ fontSize: 12, color: "var(--term-green-mid)", marginTop: 4, fontStyle: "italic", letterSpacing: "0.05em" }}>
              &quot;{agent.agentTagline}&quot;
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.2em", marginTop: 6 }}>
            AGENT · {agentId}
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}><span className="cursor-blink" /></div>
        ) : (
          <>
            <div className="term-box-glow" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 12 }}>SYSTEM STATUS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--term-green-mid)" }}>SANDBOX</span>
                  <span style={{ color: "#00ff41" }}>ONLINE</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--term-green-mid)" }}>TELEGRAM</span>
                  <span style={{ color: agent?.telegramChatId ? "#00ff41" : "var(--term-amber)" }}>
                    {agent?.telegramChatId ? "CONNECTED" : "NOT CONNECTED"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--term-green-mid)" }}>PAYMENT</span>
                  <span style={{ color: agent?.paymentTxHash ? "#00ff41" : "var(--term-amber)" }}>
                    {agent?.paymentTxHash ? "CONFIRMED" : "PENDING"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--term-green-mid)" }}>WALLET</span>
                  <span style={{ fontSize: 11 }}>{agent?.walletAddress ? agent.walletAddress.slice(0, 10) + "…" : "NOT SET"}</span>
                </div>
              </div>
              {agent?.agentSpecialty && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--term-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--term-green-mid)" }}>SPECIALTY</span>
                    <span style={{ fontSize: 12, color: "var(--term-green)", textAlign: "right", maxWidth: "65%" }}>{agent.agentSpecialty}</span>
                  </div>
                  {agent.agentTone && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6 }}>
                      <span style={{ color: "var(--term-green-mid)" }}>TONE</span>
                      <span style={{ fontSize: 12, color: "var(--term-green)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{agent.agentTone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <INFTCard
              agentId={agentId!}
              agentWallet={agent?.walletAddress ?? null}
              inft={inft}
              onUpdate={fetchInft}
            />

            <OwnerControls
              agentId={agentId!}
              agent={agent}
              onboarding={onboarding}
              ownerHeaders={ownerHeaders}
              onAgentUpdate={setAgent}
              onOnboardingUpdate={setOnboarding}
            />

            <div className="term-box-glow" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 4 }}>COMPANY CONTEXT</div>
              {onboarding ? (
                <div style={{ marginTop: 8 }}>
                  {Object.entries(CONTEXT_LABELS).map(([key, label]) => (
                    <Row key={key} label={label} value={onboarding[key]} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--term-green-mid)", marginTop: 8 }}>
                  ▸ no context data —{" "}
                  <Link href={`/onboarding?agentId=${agentId}`} style={{ color: "var(--term-green)", textDecoration: "underline" }}>complete onboarding</Link>
                </div>
              )}
            </div>

            <div className="term-box-glow" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)" }}>
                  ALERTS {alerts.length > 0 && <span style={{ color: "var(--term-amber)" }}>({alerts.length})</span>}
                </div>
                <button
                  className="term-btn"
                  style={{ fontSize: 10, padding: "4px 12px", letterSpacing: "0.1em" }}
                  onClick={triggerSweep}
                  disabled={sweeping}
                >
                  <span>{sweeping ? "SCANNING..." : "RUN SWEEP"}</span>
                </button>
              </div>

              {alerts.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}>
                  ▸ no alerts — {sweeping ? <span className="cursor-blink" /> : "run a sweep or upload documents to get started"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} style={{ padding: "10px 12px", border: `1px solid ${SEVERITY_COLOR[alert.severity] ?? "var(--term-green-dim)"}`, background: "rgba(0,0,0,0.3)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: SEVERITY_COLOR[alert.severity], fontWeight: 600, letterSpacing: "0.1em" }}>
                          [{alert.severity.toUpperCase()}] {alert.type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--term-green-dim)" }}>
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 2 }}>{alert.title}</div>
                      <div style={{ fontSize: 11, color: "var(--term-green-mid)", lineHeight: 1.5 }}>{alert.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {agent?.telegramChatId ? (
              <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 20, fontSize: 12, color: "var(--term-green-mid)", letterSpacing: "0.08em" }}>
                ▸ ClawCounsel is live in <span style={{ color: "var(--term-green)" }}>{agent.telegramChatTitle ?? "your Telegram group"}</span>. Use <span style={{ color: "var(--term-green)" }}>/ask</span> to ask legal questions.
              </div>
            ) : (
              <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 20, fontSize: 12, color: "var(--term-amber)", letterSpacing: "0.08em" }}>
                ▸ Telegram not connected — add <span style={{ color: "var(--term-green)" }}>@{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "clawcounselBot"}</span> to your group and send <span style={{ color: "var(--term-green)" }}>/connect {agentId}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--term-border)", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.08em" }}>
        <span>CLAWCOUNSEL OS</span>
        <span>CLAWCOUNSEL · BASE · CLAUDE</span>
      </div>
    </main>
  );
}
