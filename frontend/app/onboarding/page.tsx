"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const QUESTIONS = [
  { key: "claimDescription", label: "What is your primary legal claim or concern?", hint: "e.g. copyright infringement, contract breach, IP theft", type: "textarea" },
  { key: "claimType",        label: "What type of legal issue is this?",            hint: "copyright · contract · ip · other",                   type: "input"    },
  { key: "opposingParty",    label: "Who is the opposing party?",                   hint: "Company name or individual",                          type: "input"    },
  { key: "opposingGithubUsername", label: "GitHub username of opposing party (optional)", hint: "@username — we'll monitor for infringement",   type: "input"    },
  { key: "evidenceDescription",    label: "Describe the key evidence you have.",        hint: "Contracts, timestamps, code commits, screenshots", type: "textarea" },
];

function Field({
  q, value, onChange, disabled,
}: {
  q: (typeof QUESTIONS)[0]; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: "0.15em", color: focused ? "var(--term-green)" : "var(--term-green-mid)", marginBottom: 6, fontWeight: 600, transition: "color 0.15s" }}>
        {q.key.toUpperCase()}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, borderBottom: `1px solid ${focused ? "var(--term-green)" : "var(--term-green-dim)"}`, paddingBottom: 4, transition: "border-color 0.15s" }}>
        <span style={{ color: focused ? "var(--term-green)" : "var(--term-green-dim)", marginTop: q.type === "textarea" ? 2 : 0, flexShrink: 0, transition: "color 0.15s" }}>▸</span>
        {q.type === "textarea" ? (
          <textarea
            rows={3}
            className="term-input"
            style={{ resize: "none", lineHeight: 1.6 }}
            placeholder={q.hint}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : (
          <input
            className="term-input"
            placeholder={q.hint}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        )}
      </div>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const agentId = params.get("agentId");

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"questions" | "telegram">("questions");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connected, setConnected] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "OpenClawBot";

  // Poll for Telegram connection
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
    setPhase("telegram");
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

  if (phase === "telegram") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
        <div className="term-statusbar">
          <span>CLAWCOUNSEL OS · /onboarding</span>
          <span>STEP 2 OF 2 — TELEGRAM</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ width: "100%", maxWidth: 540 }}>
            <div className="term-box-glow" style={{ padding: "28px 24px" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 20 }}>
                CONNECT TELEGRAM
              </div>

              {connected ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div className="term-glow-static" style={{ fontSize: 20, marginBottom: 8 }}>✓ CONNECTED</div>
                  <div style={{ fontSize: 12, color: "var(--term-green-mid)" }}>Redirecting to dashboard<span className="cursor-blink" /></div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                    {/* Step 1 */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>01</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>Add the bot to your Telegram group</div>
                        <div style={{ fontSize: 11, color: "var(--term-green-mid)" }}>Search for <span style={{ color: "var(--term-green)", fontWeight: 600 }}>@{botUsername}</span> and add to your company group</div>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>02</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>Send the connect command in the group</div>
                        <div
                          style={{
                            fontSize: 13,
                            background: "rgba(0,255,65,0.06)",
                            border: "1px solid var(--term-green-dim)",
                            padding: "8px 12px",
                            letterSpacing: "0.05em",
                            wordBreak: "break-all",
                            marginTop: 6,
                          }}
                        >
                          /connect {agentId}
                        </div>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--term-amber)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 1 }}>03</div>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--term-green)", marginBottom: 4 }}>OpenClaw starts learning</div>
                        <div style={{ fontSize: 11, color: "var(--term-green-mid)" }}>The agent will index all future messages and answer legal questions via <span style={{ color: "var(--term-green)" }}>/ask</span></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--term-border)", paddingTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--term-green-dim)" }}>
                      <span className="cursor-blink" /> waiting for connection...
                    </div>
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

  const current = QUESTIONS[step];

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--term-bg)", color: "var(--term-green)", fontFamily: "var(--font-mono), monospace" }}>
      <div className="term-statusbar">
        <span>CLAWCOUNSEL OS · /onboarding</span>
        <span>STEP 1 OF 2 — CLAIM INTAKE · Q{step + 1}/{QUESTIONS.length}</span>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div className="term-box-glow" style={{ padding: "28px 24px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 20 }}>
              LEGAL CLAIM INTAKE
            </div>

            <div style={{ marginBottom: 8, fontSize: 14, color: "var(--term-green)", lineHeight: 1.5 }}>
              {current.label}
            </div>

            <div style={{ marginBottom: 20 }}>
              <Field
                q={current}
                value={answers[current.key] ?? ""}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [current.key]: v }))}
                disabled={loading}
              />
            </div>

            {/* Progress dots */}
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
                  <span>{loading ? "SAVING..." : "CONTINUE TO TELEGRAM →"}</span>
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
