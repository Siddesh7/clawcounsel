"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, encodeFunctionData, parseUnits } from "viem";
import { base } from "viem/chains";
import {
  BACKEND_URL,
  USDC_CONTRACT_BASE,
  TREASURY_ADDRESS,
  USDC_AMOUNT,
  USDC_DECIMALS,
  ERC20_TRANSFER_ABI,
} from "@/lib/constants";

type Phase = "info" | "payment" | "deploying";

const FIELDS = [
  { key: "companyName", prompt: "COMPANY_NAME", hint: "e.g. Acme Corp", required: true },
  { key: "companyId", prompt: "COMPANY_ID", hint: "e.g. acme-corp  (lowercase, no spaces)", required: true },
];

export default function DeployPage() {
  const router = useRouter();
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();

  const [values, setValues] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [txHash, setTxHash] = useState("");

  function pushLog(line: string) {
    setLog((prev) => [...prev, line]);
  }

  async function handleContinueToPayment() {
    if (!values.companyName || !values.companyId) {
      setError("COMPANY_NAME and COMPANY_ID are required.");
      return;
    }
    setError("");
    setPhase("payment");
    if (!authenticated) login();
  }

  async function handlePayment() {
    setLoading(true);
    setError("");
    setLog([]);
    pushLog("▸ initializing payment on Base...");

    try {
      if (!authenticated) {
        await login();
        return;
      }

      const wallet = wallets.find((w) => w.walletClientType !== "privy") ?? wallets[0];
      if (!wallet) throw new Error("No wallet connected");

      pushLog(`▸ wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
      await delay(300);

      await wallet.switchChain(base.id);
      pushLog("▸ switched to Base Mainnet");
      await delay(200);

      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
        account: wallet.address as `0x${string}`,
      });

      pushLog(`▸ sending ${USDC_AMOUNT} USDC to treasury...`);

      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [TREASURY_ADDRESS, parseUnits(String(USDC_AMOUNT), USDC_DECIMALS)],
      });

      const hash = await walletClient.sendTransaction({
        to: USDC_CONTRACT_BASE,
        data,
        chain: base,
        account: wallet.address as `0x${string}`,
      });

      setTxHash(hash);
      pushLog(`▸ tx confirmed: ${hash.slice(0, 10)}...   [ OK ]`);
      await delay(400);

      await handleDeploy(wallet.address, hash);
    } catch (e: any) {
      const msg = e?.shortMessage ?? e?.message ?? "Payment failed";
      pushLog(`▸ ERROR: ${msg}`);
      setError(msg);
      setLoading(false);
    }
  }

  async function handleDeploy(walletAddress: string, paymentTxHash: string) {
    pushLog("▸ connecting to openclaw deploy service...");
    await delay(400);

    try {
      const res = await fetch(`${BACKEND_URL}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: values.companyName,
          companyId: values.companyId,
          walletAddress,
          paymentTxHash,
        }),
      });

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body.agentId) {
          pushLog("▸ agent already exists — resuming");
          await delay(400);
          router.push(`/onboarding?agentId=${body.agentId}`);
          return;
        }
        throw new Error(body.error ?? "Agent already exists");
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { agent } = await res.json();
      pushLog("▸ sandbox instance allocated   [ OK ]");
      await delay(300);
      pushLog("▸ iNFT mint queued             [ PENDING ]");
      await delay(300);
      pushLog(`▸ agent id: ${agent.id}`);
      await delay(400);
      pushLog("▸ redirecting to onboarding...");
      await delay(600);
      router.push(`/onboarding?agentId=${agent.id}`);
    } catch (e: any) {
      pushLog(`▸ ERROR: ${e.message}`);
      setError(e.message);
      setLoading(false);
    }
  }

  const statusRight =
    phase === "info" ? "STEP 1 — COMPANY INFO" :
    phase === "payment" ? "STEP 2 — PAYMENT" : "DEPLOYING";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>
          <Link href="/" style={{ color: "var(--term-bg)", textDecoration: "none", marginRight: 16 }}>← CLAWCOUNSEL</Link>
          /deploy
        </span>
        <span>{statusRight}</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ border: "1px solid var(--term-green-dim)", boxShadow: "0 0 40px rgba(0,255,65,0.05), inset 0 0 60px rgba(0,0,0,0.4)" }}>
            <div style={{ borderBottom: "1px solid var(--term-green-dim)", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,255,65,0.04)" }}>
              <span className="term-glow-static" style={{ fontSize: 13, letterSpacing: "0.15em" }}>OPENCLAW DEPLOY</span>
              <span style={{ fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.1em" }}>BASE MAINNET</span>
            </div>

            <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
              {phase === "info" && (
                <>
                  {FIELDS.map((field) => (
                    <div key={field.key}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: focused === field.key ? "var(--term-green)" : "var(--term-green-mid)", letterSpacing: "0.15em", transition: "color 0.15s", fontWeight: 600 }}>{field.prompt}</span>
                        {field.required && <span style={{ fontSize: 10, color: "var(--term-amber)", letterSpacing: "0.1em" }}>REQUIRED</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${focused === field.key ? "var(--term-green)" : "var(--term-green-dim)"}`, paddingBottom: 4, transition: "border-color 0.15s" }}>
                        <span style={{ color: focused === field.key ? "var(--term-green)" : "var(--term-green-dim)", fontSize: 14, flexShrink: 0, transition: "color 0.15s" }}>▸</span>
                        <input className="term-input" style={{ flex: 1, fontSize: 14 }} placeholder={field.hint} value={values[field.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))} onFocus={() => setFocused(field.key)} onBlur={() => setFocused(null)} onKeyDown={(e) => { if (e.key === "Enter") handleContinueToPayment(); }} />
                      </div>
                    </div>
                  ))}
                  {error && <div style={{ fontSize: 12, color: "#ff4444", letterSpacing: "0.05em" }}>✕ {error}</div>}
                  <button className="term-btn" style={{ width: "100%", fontSize: 13, letterSpacing: "0.2em", padding: "12px" }} onClick={handleContinueToPayment}>
                    <span>[ CONTINUE TO PAYMENT ]</span>
                  </button>
                </>
              )}

              {phase === "payment" && !loading && (
                <>
                  <div style={{ textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 12 }}>AGENT SUBSCRIPTION</div>
                    <div className="term-glow-static" style={{ fontSize: 28, marginBottom: 4 }}>50 USDC</div>
                    <div style={{ fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.1em" }}>on Base Mainnet · one-time deployment fee</div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--term-green-mid)" }}>
                      <span>COMPANY</span>
                      <span style={{ color: "var(--term-green)" }}>{values.companyName}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--term-green-mid)" }}>
                      <span>AGENT ID</span>
                      <span style={{ color: "var(--term-green)" }}>{values.companyId}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--term-green-mid)" }}>
                      <span>WALLET</span>
                      <span style={{ color: "var(--term-green)" }}>
                        {authenticated && wallets[0] ? `${wallets[0].address.slice(0, 6)}...${wallets[0].address.slice(-4)}` : "not connected"}
                      </span>
                    </div>
                  </div>

                  {error && <div style={{ fontSize: 12, color: "#ff4444", letterSpacing: "0.05em" }}>✕ {error}</div>}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="term-btn" style={{ fontSize: 12, padding: "10px 20px" }} onClick={() => { setPhase("info"); setError(""); }}>
                      <span>← BACK</span>
                    </button>
                    {!authenticated || !wallets[0] ? (
                      <button className="term-btn" style={{ flex: 1, fontSize: 13, letterSpacing: "0.15em", padding: "12px" }} onClick={() => login()}>
                        <span>[ CONNECT WALLET ]</span>
                      </button>
                    ) : (
                      <button className="term-btn" style={{ flex: 1, fontSize: 13, letterSpacing: "0.15em", padding: "12px" }} onClick={handlePayment}>
                        <span>[ PAY 50 USDC ]</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {(phase === "deploying" || (phase === "payment" && loading)) && log.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {log.map((line, i) => (
                    <div key={i} className="boot-line" style={{ fontSize: 12, color: line.includes("ERROR") ? "#ff4444" : line.includes("OK") ? "var(--term-green)" : "var(--term-green-mid)", letterSpacing: "0.05em" }}>
                      {line}
                    </div>
                  ))}
                  {loading && <div style={{ fontSize: 12, color: "var(--term-green-dim)" }}><span className="cursor-blink" /></div>}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.08em", textAlign: "center" }}>
            ▸ deploying creates a sandboxed openclaw instance · iNFT minted on OG Labs · billed in USDC
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--term-border)", padding: "10px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--term-green-dim)", letterSpacing: "0.08em" }}>
        <span>CLAWCOUNSEL OS</span>
        <span>{phase === "info" ? "press ENTER to continue" : "Base Mainnet · USDC"}</span>
      </div>
    </main>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
