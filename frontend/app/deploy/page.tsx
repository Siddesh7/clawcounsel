"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type Field = {
  key: string;
  prompt: string;
  label: string;
  hint: string;
  required: boolean;
};

const FIELDS: Field[] = [
  {
    key: "companyName",
    prompt: "COMPANY_NAME",
    label: "Legal company name",
    hint: "e.g. Acme Corp",
    required: true,
  },
  {
    key: "companyId",
    prompt: "COMPANY_ID",
    label: "Unique slug / identifier",
    hint: "e.g. acme-corp  (lowercase, no spaces)",
    required: true,
  },
  {
    key: "walletAddress",
    prompt: "WALLET_ADDR",
    label: "Wallet address for iNFT ownership",
    hint: "0x...  (optional — can link later)",
    required: false,
  },
];

export default function DeployPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState<string[]>([]);

  function pushLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function handleDeploy() {
    if (!values.companyName || !values.companyId) {
      setError("COMPANY_NAME and COMPANY_ID are required.");
      return;
    }
    setError("");
    setLoading(true);
    setLog([]);

    pushLog("▸ validating input parameters...");
    await delay(400);
    pushLog("▸ connecting to openclaw deploy service...");
    await delay(500);

    try {
      const res = await fetch(`${BACKEND_URL}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: values.companyName,
          companyId: values.companyId,
          walletAddress: values.walletAddress ?? "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { agent } = await res.json();
      pushLog(`▸ sandbox instance allocated   [ OK ]`);
      await delay(300);
      pushLog(`▸ iNFT mint queued             [ PENDING ]`);
      await delay(300);
      pushLog(`▸ agent id: ${agent.id}`);
      await delay(400);
      pushLog(`▸ redirecting to onboarding...`);
      await delay(600);
      router.push(`/onboarding?agentId=${agent.id}`);
    } catch (e: any) {
      pushLog(`▸ ERROR: ${e.message}`);
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--term-bg)",
        color: "var(--term-green)",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      {/* ── Status Bar ─────────────────────────────────── */}
      <div className="term-statusbar">
        <span>
          <Link
            href="/"
            style={{ color: "var(--term-bg)", textDecoration: "none", marginRight: 16 }}
          >
            ← CLAWCOUNSEL
          </Link>
          /deploy
        </span>
        <span>OPENCLAW DEPLOY v0.1.0</span>
      </div>

      {/* ── Main window ────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560 }}>

          {/* Terminal window chrome */}
          <div
            style={{
              border: "1px solid var(--term-green-dim)",
              boxShadow: "0 0 40px rgba(0,255,65,0.05), inset 0 0 60px rgba(0,0,0,0.4)",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                borderBottom: "1px solid var(--term-green-dim)",
                padding: "8px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(0,255,65,0.04)",
              }}
            >
              <span
                className="term-glow-static"
                style={{ fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                OPENCLAW DEPLOY
              </span>
              <span style={{ fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.1em" }}>
                SANDBOX MODE
              </span>
            </div>

            {/* Form body */}
            <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

              {FIELDS.map((field) => (
                <div key={field.key}>
                  {/* Prompt label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: focused === field.key ? "var(--term-green)" : "var(--term-green-mid)",
                        letterSpacing: "0.15em",
                        transition: "color 0.15s",
                        userSelect: "none",
                        fontWeight: 600,
                      }}
                    >
                      {field.prompt}
                    </span>
                    {field.required && (
                      <span style={{ fontSize: 10, color: "var(--term-amber)", letterSpacing: "0.1em" }}>
                        REQUIRED
                      </span>
                    )}
                  </div>

                  {/* Input row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderBottom: `1px solid ${focused === field.key ? "var(--term-green)" : "var(--term-green-dim)"}`,
                      paddingBottom: 4,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <span
                      style={{
                        color: focused === field.key ? "var(--term-green)" : "var(--term-green-dim)",
                        fontSize: 14,
                        userSelect: "none",
                        transition: "color 0.15s",
                        flexShrink: 0,
                      }}
                    >
                      ▸
                    </span>
                    <input
                      className="term-input"
                      style={{ flex: 1, fontSize: 14 }}
                      placeholder={field.hint}
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      onFocus={() => setFocused(field.key)}
                      onBlur={() => setFocused(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading) handleDeploy();
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
              ))}

              {/* Error */}
              {error && (
                <div style={{ fontSize: 12, color: "#ff4444", letterSpacing: "0.05em" }}>
                  ✕ {error}
                </div>
              )}

              {/* Deploy output log */}
              {log.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid var(--term-border)",
                    paddingTop: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {log.map((line, i) => (
                    <div
                      key={i}
                      className="boot-line"
                      style={{
                        fontSize: 12,
                        color: line.includes("ERROR") ? "#ff4444" : line.includes("OK") ? "var(--term-green)" : "var(--term-green-mid)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {line}
                    </div>
                  ))}
                  {loading && (
                    <div style={{ fontSize: 12, color: "var(--term-green-dim)" }}>
                      <span className="cursor-blink" />
                    </div>
                  )}
                </div>
              )}

              {/* Execute button */}
              {!loading && log.length === 0 && (
                <div style={{ paddingTop: 8 }}>
                  <button
                    className="term-btn"
                    style={{ width: "100%", fontSize: 13, letterSpacing: "0.2em", padding: "12px" }}
                    onClick={handleDeploy}
                    disabled={loading}
                  >
                    <span>[ EXECUTE DEPLOY ]</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-note */}
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              color: "var(--term-green-dim)",
              letterSpacing: "0.08em",
              textAlign: "center",
            }}
          >
            ▸ deploying creates a sandboxed openclaw instance · iNFT minted on OG Labs · billed in USDC
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--term-border)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--term-green-dim)",
          letterSpacing: "0.08em",
        }}
      >
        <span>CLAWCOUNSEL OS</span>
        <span>press ENTER to deploy</span>
      </div>
    </main>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
