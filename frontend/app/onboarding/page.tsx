"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BACKEND_URL } from "@/lib/constants";

const QUESTIONS = [
  { key: "industry", label: "What industry is your company in?", hint: "e.g. SaaS, fintech, e-commerce, healthcare", type: "input" },
  { key: "documentTypes", label: "What types of legal documents do you handle?", hint: "contracts, NDAs, vendor agreements, employment, IP licenses", type: "textarea" },
  { key: "legalConcerns", label: "What are your primary legal concerns?", hint: "contract compliance, IP protection, vendor management, payment tracking", type: "textarea" },
  { key: "activeContracts", label: "How many active contracts or vendor relationships?", hint: "e.g. 12 vendor contracts, 3 client MSAs, 8 NDAs", type: "input" },
  { key: "monitoringPriorities", label: "What should your agent prioritize monitoring?", hint: "payment deadlines, contract renewals, compliance dates, IP infringement", type: "textarea" },
];

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const agentId = params.get("agentId");

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"questions" | "documents" | "telegram">("questions");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [uploadLog, setUploadLog] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "OpenClawBot";

  useEffect(() => {
    if (phase !== "telegram" || !agentId || connected) return;
    const interval = setInterval(async () => {
      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}`).then((r) => r.json()).catch(() => null);
      if (res?.agent?.telegramChatId) {
        setConnected(true);
        clearInterval(interval);
        setTimeout(() => router.push(`/dashboard/${agentId}`), 1500);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, agentId, connected, router]);

  async function submitAnswers() {
    setLoading(true);
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, onboardingComplete: false }),
    });
    setLoading(false);
    setPhase("documents");
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file, file.name);
      setUploadLog((prev) => [...prev, `▸ uploading ${file.name}...`]);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.documents) {
        for (const doc of data.documents) {
          setUploadLog((prev) => [...prev, `▸ processed ${doc.name} — ${doc.chunks} sections   [ OK ]`]);
        }
      }
      setUploadLog((prev) => [...prev, `▸ ${data.uploaded} document(s) added to agent workspace`]);
    } catch {
      setUploadLog((prev) => [...prev, "▸ ERROR: upload failed"]);
    }
    setLoading(false);
  }

  async function skipTelegram() {
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    router.push(`/dashboard/${agentId}`);
  }

  if (!agentId) return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--term-bg)", fontFamily: "var(--font-mono), monospace", color: "var(--term-green)" }}>
      <span>Missing agent ID.</span>
    </main>
  );

  const stepLabel =
    phase === "questions" ? `STEP 1 OF 3 — COMPANY CONTEXT · Q${step + 1}/${QUESTIONS.length}` :
    phase === "documents" ? "STEP 2 OF 3 — DOCUMENTS" : "STEP 3 OF 3 — TELEGRAM";

  /* ── TELEGRAM CONNECT ─────────────────────────────── */
  if (phase === "telegram") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
        <div className="term-statusbar">
          <span>CLAWCOUNSEL OS · /onboarding</span>
          <span>{stepLabel}</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ width: "100%", maxWidth: 540 }}>
            <div className="term-box-glow" style={{ padding: "28px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 20 }}>CONNECT TELEGRAM</div>
              {connected ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div className="term-glow-static" style={{ fontSize: 20, marginBottom: 8 }}>✓ CONNECTED</div>
                  <div style={{ fontSize: 12, color: "var(--term-green-mid)" }}>Redirecting to dashboard<span className="cursor-blink" /></div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>01</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>Add the bot to your Telegram group</div>
                        <div style={{ fontSize: 11, color: "var(--term-green-mid)" }}>Search for <span style={{ color: "var(--term-green)", fontWeight: 600 }}>@{botUsername}</span> and add to your company group</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>02</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>Send the connect command in the group</div>
                        <div style={{ fontSize: 13, background: "rgba(0,255,65,0.06)", border: "1px solid var(--term-green-dim)", padding: "8px 12px", letterSpacing: "0.05em", wordBreak: "break-all", marginTop: 6 }}>/connect {agentId}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>03</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>OpenClaw starts learning</div>
                        <div style={{ fontSize: 11, color: "var(--term-green-mid)" }}>The agent will index all future messages and answer questions via <span style={{ color: "var(--term-green)" }}>/ask</span></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--term-green-dim)" }}><span className="cursor-blink" /> waiting for connection...</div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button className="term-btn" style={{ width: "100%", fontSize: 12, padding: "10px" }} onClick={skipTelegram}>
                      <span>SKIP FOR NOW — SET UP LATER</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── DOCUMENT UPLOAD ──────────────────────────────── */
  if (phase === "documents") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
        <div className="term-statusbar">
          <span>CLAWCOUNSEL OS · /onboarding</span>
          <span>{stepLabel}</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            <div className="term-box-glow" style={{ padding: "28px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 20 }}>UPLOAD DOCUMENTS</div>
              <div style={{ fontSize: 13, color: "var(--term-green)", lineHeight: 1.6, marginBottom: 20 }}>
                Upload your contracts, NDAs, vendor agreements, and any legal documents. Your agent will analyze them and use them to answer questions.
              </div>

              <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleFileUpload(e.target.files)} />

              <div
                onClick={() => !loading && fileRef.current?.click()}
                style={{
                  border: "1px dashed var(--term-green-dim)",
                  padding: "24px",
                  textAlign: "center",
                  cursor: loading ? "default" : "pointer",
                  transition: "border-color 0.15s",
                  marginBottom: 20,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--term-green)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--term-green-dim)")}
              >
                <div style={{ fontSize: 20, marginBottom: 8 }}>↑</div>
                <div style={{ fontSize: 12, color: "var(--term-green-mid)" }}>
                  {loading ? "Processing..." : "Click to upload PDFs, text files, or documents"}
                </div>
                <div style={{ fontSize: 10, color: "var(--term-green-dim)", marginTop: 4 }}>PDF · TXT · MD</div>
              </div>

              {uploadLog.length > 0 && (
                <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 12, marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                  {uploadLog.map((line, i) => (
                    <div key={i} className="boot-line" style={{ fontSize: 12, color: line.includes("ERROR") ? "#ff4444" : line.includes("OK") ? "var(--term-green)" : "var(--term-green-mid)", letterSpacing: "0.05em" }}>
                      {line}
                    </div>
                  ))}
                </div>
              )}

              <button className="term-btn" style={{ width: "100%", fontSize: 12, padding: "10px" }} onClick={() => setPhase("telegram")}>
                <span>{uploadLog.length > 0 ? "CONTINUE TO TELEGRAM →" : "SKIP — UPLOAD LATER"}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── QUESTIONS ────────────────────────────────────── */
  const current = QUESTIONS[step];

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>CLAWCOUNSEL OS · /onboarding</span>
        <span>{stepLabel}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div className="term-box-glow" style={{ padding: "28px 24px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 20 }}>COMPANY CONTEXT</div>
            <div style={{ marginBottom: 8, fontSize: 14, color: "var(--term-green)", lineHeight: 1.5 }}>{current.label}</div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, borderBottom: "1px solid var(--term-green-dim)", paddingBottom: 4 }}>
                <span style={{ color: "var(--term-green-dim)", marginTop: current.type === "textarea" ? 2 : 0, flexShrink: 0 }}>▸</span>
                {current.type === "textarea" ? (
                  <textarea rows={3} className="term-input" style={{ resize: "none", lineHeight: 1.6 }} placeholder={current.hint} value={answers[current.key] ?? ""} disabled={loading} onChange={(e) => setAnswers((prev) => ({ ...prev, [current.key]: e.target.value }))} />
                ) : (
                  <input className="term-input" placeholder={current.hint} value={answers[current.key] ?? ""} disabled={loading} onChange={(e) => setAnswers((prev) => ({ ...prev, [current.key]: e.target.value }))} />
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {QUESTIONS.map((_, i) => (
                <div key={i} style={{ width: 6, height: 6, background: i <= step ? "var(--term-green)" : "var(--term-green-dim)", transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {step > 0 && (
                <button className="term-btn" style={{ fontSize: 12, padding: "9px 20px" }} onClick={() => setStep((s) => s - 1)} disabled={loading}>
                  <span>← BACK</span>
                </button>
              )}
              {step < QUESTIONS.length - 1 ? (
                <button className="term-btn" style={{ flex: 1, fontSize: 12, padding: "9px" }} onClick={() => setStep((s) => s + 1)}>
                  <span>NEXT →</span>
                </button>
              ) : (
                <button className="term-btn" style={{ flex: 1, fontSize: 12, padding: "9px" }} onClick={submitAnswers} disabled={loading}>
                  <span>{loading ? "SAVING..." : "CONTINUE TO DOCUMENTS →"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return <Suspense><OnboardingContent /></Suspense>;
}
