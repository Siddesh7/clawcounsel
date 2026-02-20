"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const CLAIM_LABELS: Record<string, string> = {
  claimDescription:       "CLAIM",
  claimType:              "TYPE",
  opposingParty:          "OPPOSING PARTY",
  opposingGithubUsername: "GITHUB TARGET",
  evidenceDescription:    "EVIDENCE",
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
  const [agent, setAgent]           = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!agentId) return;
    Promise.all([
      fetch(`${BACKEND_URL}/api/agents/${agentId}`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`).then((r) => r.json()),
    ]).then(([a, o]) => {
      setAgent(a.agent);
      setOnboarding(o.onboarding);
    }).finally(() => setLoading(false));
  }, [agentId]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>
          <Link href="/dashboard" style={{ color: "var(--term-bg)", textDecoration: "none", marginRight: 16 }}>← CLAIMS</Link>
          /dashboard/{agentId}
        </span>
        <span style={{ display: "flex", gap: 20 }}>
          <span>{agent?.companyName ?? "—"}</span>
          <span style={{ color: agent?.slackTeamId ? "#00ff41" : "var(--term-amber)" }}>
            {agent?.slackTeamId ? "● SLACK" : "○ SLACK PENDING"}
          </span>
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: "100%", margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <div className="font-display term-glow-static" style={{ fontSize: 36, letterSpacing: "0.05em", lineHeight: 1 }}>
            {agent?.companyName ?? "OPENCLAW"}
          </div>
          <div style={{ fontSize: 11, color: "var(--term-green-mid)", letterSpacing: "0.2em", marginTop: 4 }}>
            AGENT · {agentId}
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}><span className="cursor-blink" /></div>
        ) : (
          <>
            {/* System status */}
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
                  <span style={{ color: "var(--term-green-mid)" }}>iNFT</span>
                  <span style={{ color: agent?.nftTokenId ? "#00ff41" : "var(--term-amber)" }}>
                    {agent?.nftTokenId ?? "PENDING MINT"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--term-green-mid)" }}>WALLET</span>
                  <span style={{ fontSize: 11 }}>{agent?.walletAddress ? agent.walletAddress.slice(0, 10) + "…" : "NOT SET"}</span>
                </div>
              </div>
            </div>

            {/* Claim detail */}
            <div className="term-box-glow" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 4 }}>LEGAL CLAIM</div>
              {onboarding ? (
                <div style={{ marginTop: 8 }}>
                  {Object.entries(CLAIM_LABELS).map(([key, label]) => (
                    <Row key={key} label={label} value={onboarding[key]} />
                  ))}
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--term-green-dim)" }}>
                    ▸ onboarding complete: {onboarding.onboardingComplete ? "YES" : "NO"}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--term-green-mid)", marginTop: 8 }}>
                  ▸ no claim data —{" "}
                  <Link href={`/onboarding?agentId=${agentId}`} style={{ color: "var(--term-green)", textDecoration: "underline" }}>
                    complete onboarding
                  </Link>
                </div>
              )}
            </div>

            {/* Alerts */}
            <div className="term-box-glow" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 12 }}>ALERTS</div>
              <div style={{ fontSize: 13, color: "var(--term-green-mid)" }}>▸ monitoring active · no alerts yet</div>
              <div style={{ fontSize: 11, color: "var(--term-green-dim)", marginTop: 6 }}>
                Payment overdue, contract breach, and IP signals will appear here once documents are ingested.
              </div>
            </div>

            {agent?.telegramChatId && (
              <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 20, fontSize: 12, color: "var(--term-green-mid)", letterSpacing: "0.08em" }}>
                ▸ OpenClaw is live in <span style={{ color: "var(--term-green)" }}>{agent.telegramChatTitle ?? "your Telegram group"}</span>. Use <span style={{ color: "var(--term-green)" }}>/ask</span> to ask legal questions.
              </div>
            )}
            {!agent?.telegramChatId && (
              <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 20, fontSize: 12, color: "var(--term-amber)", letterSpacing: "0.08em" }}>
                ▸ Telegram not connected — add <span style={{ color: "var(--term-green)" }}>@{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "OpenClawBot"}</span> to your group and send <span style={{ color: "var(--term-green)" }}>/connect {agentId}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--term-border)", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.08em" }}>
        <span>CLAWCOUNSEL OS</span>
        <span>OG LABS iNFT · KITE · CLAUDE</span>
      </div>
    </main>
  );
}
