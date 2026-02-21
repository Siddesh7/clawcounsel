"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { BACKEND_URL } from "@/lib/constants";

type Agent = {
  id: string;
  companyName: string;
  companyId: string;
  agentCodename: string | null;
  agentSpecialty: string | null;
  agentTone: string | null;
  agentTagline: string | null;
  status: string;
  telegramChatId: string | null;
  paymentTxHash: string | null;
  nftTokenId: string | null;
  createdAt: string;
  onboarding: {
    industry?: string;
    legalConcerns?: string;
    monitoringPriorities?: string;
    onboardingComplete?: boolean;
  } | null;
};

const STATUS_COLOR: Record<string, string> = {
  active: "#00ff41",
  onboarding: "var(--term-amber)",
  pending: "var(--term-green-mid)",
};

export default function DashboardPage() {
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const wallet = wallets.find((w) => w.walletClientType !== "privy") ?? wallets[0];

  useEffect(() => {
    if (!wallet?.address) {
      setLoading(false);
      return;
    }
    fetch(`${BACKEND_URL}/api/agents?wallet=${wallet.address}`)
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .finally(() => setLoading(false));
  }, [wallet?.address]);

  if (ready && !authenticated) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace", gap: 20 }}>
        <div className="font-display term-glow-static" style={{ fontSize: 32, letterSpacing: "0.05em" }}>AGENTS</div>
        <div style={{ fontSize: 13, color: "var(--term-green-mid)", textAlign: "center", maxWidth: 400 }}>
          Connect your wallet to view agents you own.
        </div>
        <button className="term-btn" style={{ fontSize: 13, padding: "10px 32px", letterSpacing: "0.15em" }} onClick={() => login()}>
          <span>[ CONNECT WALLET ]</span>
        </button>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>
          <Link href="/" style={{ color: "var(--term-bg)", textDecoration: "none", marginRight: 16 }}>← HOME</Link>
          /dashboard
        </span>
        <span style={{ display: "flex", gap: 20 }}>
          <span>{agents.length} AGENT{agents.length !== 1 ? "S" : ""}</span>
          <span style={{ color: "#00ff41" }}>● ONLINE</span>
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div className="font-display term-glow-static" style={{ fontSize: 40, letterSpacing: "0.05em", lineHeight: 1 }}>AGENTS</div>
            <div style={{ fontSize: 11, color: "var(--term-green-mid)", letterSpacing: "0.2em", marginTop: 4 }}>CLAWCOUNSEL DEPLOYMENTS · AI LEGAL COUNSEL</div>
          </div>
          <Link href="/deploy">
            <button className="term-btn" style={{ fontSize: 12, padding: "8px 20px", letterSpacing: "0.15em" }}>
              <span>+ DEPLOY NEW</span>
            </button>
          </Link>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--term-green-mid)", paddingTop: 20 }}><span className="cursor-blink" /></div>
        ) : agents.length === 0 ? (
          <div className="term-box-glow" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}>▸ no agents deployed yet</div>
            <div style={{ marginTop: 12 }}>
              <Link href="/deploy">
                <button className="term-btn" style={{ fontSize: 12, padding: "8px 24px" }}><span>DEPLOY YOUR FIRST AGENT</span></button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px 40px", gap: 12, padding: "8px 16px", borderBottom: "1px solid var(--term-green-dim)", fontSize: 10, letterSpacing: "0.2em", color: "var(--term-green-mid)" }}>
              <span>COMPANY</span>
              <span>INDUSTRY</span>
              <span>FOCUS</span>
              <span>INFT</span>
              <span>STATUS</span>
              <span />
            </div>

            {agents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/${agent.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="term-box"
                  style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px 40px", gap: 12, padding: "14px 16px", cursor: "pointer", transition: "background 0.1s, border-color 0.1s", borderColor: "var(--term-border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,255,65,0.04)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--term-green-dim)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--term-surface)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--term-border)"; }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 13, color: "var(--term-green)", fontWeight: 500 }}>
                      {agent.agentCodename ? (
                        <><span style={{ letterSpacing: "0.1em" }}>{agent.agentCodename}</span> <span style={{ color: "var(--term-green-mid)", fontSize: 11 }}>/ {agent.companyName}</span></>
                      ) : agent.companyName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--term-green-mid)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {agent.agentSpecialty ?? (agent.onboarding?.legalConcerns ? `▸ ${agent.onboarding.legalConcerns}` : "▸ onboarding incomplete")}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--term-green-mid)", alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.onboarding?.industry ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--term-green-mid)", alignSelf: "center", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {agent.onboarding?.monitoringPriorities?.split(",")[0]?.trim() ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, alignSelf: "center", color: agent.nftTokenId ? "#00ff41" : "var(--term-green-dim)" }}>
                    {agent.nftTokenId ? "●" : "—"}
                  </div>
                  <div style={{ fontSize: 11, alignSelf: "center", letterSpacing: "0.1em", color: STATUS_COLOR[agent.status] ?? "var(--term-green-mid)" }}>
                    {agent.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--term-green-dim)", alignSelf: "center", textAlign: "right" }}>→</div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--term-border)", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.08em" }}>
        <span>CLAWCOUNSEL OS</span>
        <span>CLAWCOUNSEL · 0G · CLAUDE</span>
      </div>
    </main>
  );
}
