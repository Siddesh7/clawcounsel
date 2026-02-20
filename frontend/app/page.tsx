"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BOOT_LINES = [
  "sys: openclaw-node v0.1.0 initializing...",
  "sys: iNFT ownership framework   [ OK ]",
  "sys: OG Labs model provider      [ OK ]",
  "sys: legal inference engine      [ OK ]",
  "sys: ready. deploy your agent.",
];

export default function Page() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleLines((n) => Math.max(n, i + 1)), 300 + i * 380)
      );
    });
    timers.push(setTimeout(() => setReady(true), 300 + BOOT_LINES.length * 380 + 200));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--term-bg)",
        color: "var(--term-green)",
      }}
    >
      {/* ── Status Bar ───────────────────────────────────── */}
      <div className="term-statusbar">
        <span>CLAWCOUNSEL OS  ·  BUILD 0.1.0</span>
        <span style={{ display: "flex", gap: 24 }}>
          <span>AGENTS: 0</span>
          <span style={{ color: "#00ff41" }}>● ONLINE</span>
        </span>
      </div>

      {/* ── Center content ───────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            className="font-display term-glow cursor-blink"
            style={{
              fontSize: "clamp(64px, 10vw, 120px)",
              lineHeight: 1,
              letterSpacing: "0.04em",
              color: "var(--term-green)",
            }}
          >
            CLAWCOUNSEL
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.3em",
              color: "var(--term-green-mid)",
              marginTop: 8,
              textTransform: "uppercase",
            }}
          >
            AI Legal Counsel Protocol · On-Chain Ownership · Powered by OG Labs iNFT
          </div>
        </div>

        {/* Boot sequence */}
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            marginBottom: 36,
            fontFamily: "var(--font-mono), monospace",
            fontSize: 13,
          }}
        >
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="boot-line"
              style={{
                animationDelay: "0ms",
                color: i === visibleLines - 1 ? "var(--term-green)" : "var(--term-green-mid)",
                padding: "2px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--term-green-dim)", userSelect: "none" }}>▸</span>
              {line}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Link href="/deploy">
            <button className="term-btn" style={{ fontSize: 15, padding: "12px 48px", letterSpacing: "0.2em" }}>
              <span>DEPLOY YOUR AGENT →</span>
            </button>
          </Link>
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 11,
              color: "var(--term-green-dim)",
              letterSpacing: "0.1em",
            }}
          >
            subscribe with USDC · own your agent via iNFT · slack integration included
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        style={{
          borderTop: "1px solid var(--term-border)",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11,
          color: "var(--term-green-dim)",
          letterSpacing: "0.08em",
        }}
      >
        <span>© 2025 CLAWCOUNSEL · ALL RIGHTS RESERVED</span>
        <span>OG LABS iNFT · KITE · CLAUDE</span>
      </div>
    </main>
  );
}
