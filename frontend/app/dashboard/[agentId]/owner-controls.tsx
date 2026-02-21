"use client";

import { useState, useRef } from "react";
import { BACKEND_URL } from "@/lib/constants";

type Doc = { id: string; name: string; type: string; createdAt: string };

type Props = {
  agentId: string;
  agent: any;
  onboarding: any;
  ownerHeaders: HeadersInit;
  onAgentUpdate: (agent: any) => void;
  onOnboardingUpdate: (ob: any) => void;
};

export function OwnerControls({
  agentId,
  agent,
  onboarding,
  ownerHeaders,
  onAgentUpdate,
  onOnboardingUpdate,
}: Props) {
  const [panel, setPanel] = useState<string | null>(null);

  return (
    <div className="term-box-glow" style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--term-green-mid)", marginBottom: 14 }}>
        OWNER CONTROLS
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(["context", "documents", "identity", "telegram"] as const).map((p) => (
          <button
            key={p}
            className="term-btn"
            style={{
              fontSize: 10,
              padding: "5px 12px",
              letterSpacing: "0.1em",
              opacity: panel === p ? 1 : 0.7,
              borderColor: panel === p ? "var(--term-green)" : undefined,
            }}
            onClick={() => setPanel(panel === p ? null : p)}
          >
            <span>
              {p === "context" && "EDIT CONTEXT"}
              {p === "documents" && "MANAGE DOCS"}
              {p === "identity" && "REGEN IDENTITY"}
              {p === "telegram" && "TELEGRAM"}
            </span>
          </button>
        ))}
      </div>

      {panel === "context" && (
        <EditContext
          agentId={agentId}
          onboarding={onboarding}
          ownerHeaders={ownerHeaders}
          onUpdate={onOnboardingUpdate}
        />
      )}
      {panel === "documents" && (
        <ManageDocs agentId={agentId} ownerHeaders={ownerHeaders} />
      )}
      {panel === "identity" && (
        <RegenIdentity
          agentId={agentId}
          agent={agent}
          ownerHeaders={ownerHeaders}
          onUpdate={onAgentUpdate}
        />
      )}
      {panel === "telegram" && (
        <TelegramPanel
          agentId={agentId}
          agent={agent}
          ownerHeaders={ownerHeaders}
          onUpdate={onAgentUpdate}
        />
      )}
    </div>
  );
}

function EditContext({
  agentId,
  onboarding,
  ownerHeaders,
  onUpdate,
}: {
  agentId: string;
  onboarding: any;
  ownerHeaders: HeadersInit;
  onUpdate: (ob: any) => void;
}) {
  const fields = [
    { key: "industry", label: "Industry" },
    { key: "documentTypes", label: "Document Types" },
    { key: "legalConcerns", label: "Legal Concerns" },
    { key: "activeContracts", label: "Active Contracts" },
    { key: "monitoringPriorities", label: "Monitoring Priorities" },
  ];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = onboarding?.[f.key] ?? "";
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...ownerHeaders },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    onUpdate(data.onboarding);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((f) => (
        <div key={f.key}>
          <label style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--term-green-mid)", display: "block", marginBottom: 3 }}>
            {f.label.toUpperCase()}
          </label>
          <input
            className="term-input"
            style={{ width: "100%", fontSize: 12, padding: "6px 8px" }}
            value={values[f.key]}
            onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      <button className="term-btn" style={{ fontSize: 11, padding: "7px 16px", alignSelf: "flex-start" }} onClick={save} disabled={saving}>
        <span>{saving ? "SAVING..." : saved ? "✓ SAVED" : "SAVE CHANGES"}</span>
      </button>
    </div>
  );
}

function ManageDocs({
  agentId,
  ownerHeaders,
}: {
  agentId: string;
  ownerHeaders: HeadersInit;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/documents`);
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoaded(true);
  }

  if (!loaded) {
    loadDocs();
    return <div style={{ marginTop: 12, fontSize: 12, color: "var(--term-green-dim)" }}>Loading<span className="cursor-blink" /></div>;
  }

  async function deleteDoc(docId: string) {
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/documents/${docId}`, {
      method: "DELETE",
      headers: ownerHeaders,
    });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadMsg("");
    const formData = new FormData();
    for (const f of Array.from(files)) formData.append("files", f, f.name);
    const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/documents/upload`, {
      method: "POST",
      headers: ownerHeaders,
      body: formData,
    });
    const data = await res.json();
    setUploadMsg(`${data.uploaded ?? 0} doc(s) uploaded`);
    setUploading(false);
    loadDocs();
  }

  return (
    <div style={{ marginTop: 14 }}>
      <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="term-btn" style={{ fontSize: 10, padding: "5px 12px" }} onClick={() => fileRef.current?.click()} disabled={uploading}>
          <span>{uploading ? "UPLOADING..." : "↑ UPLOAD"}</span>
        </button>
        {uploadMsg && <span style={{ fontSize: 11, color: "var(--term-green)" }}>{uploadMsg}</span>}
      </div>
      {docs.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--term-green-mid)" }}>▸ no documents uploaded</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {docs.map((doc) => (
            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", border: "1px solid var(--term-border)", fontSize: 12 }}>
              <div>
                <span style={{ color: "var(--term-green)" }}>{doc.name}</span>
                <span style={{ color: "var(--term-green-dim)", marginLeft: 8, fontSize: 10 }}>{doc.type}</span>
              </div>
              <button
                style={{ background: "none", border: "1px solid var(--term-green-dim)", color: "#ff4444", fontSize: 9, padding: "2px 8px", cursor: "pointer", letterSpacing: "0.1em" }}
                onClick={() => deleteDoc(doc.id)}
              >
                DELETE
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegenIdentity({
  agentId,
  agent,
  ownerHeaders,
  onUpdate,
}: {
  agentId: string;
  agent: any;
  ownerHeaders: HeadersInit;
  onUpdate: (agent: any) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);

  async function regen() {
    setRegenerating(true);
    const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/regenerate-identity`, {
      method: "POST",
      headers: ownerHeaders,
    });
    const data = await res.json();
    if (data.agent) onUpdate(data.agent);
    setRegenerating(false);
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, color: "var(--term-green-mid)", marginBottom: 10, lineHeight: 1.5 }}>
        Generate a new codename, specialty, tone and tagline for your agent based on your company context.
      </div>
      <div style={{ fontSize: 12, color: "var(--term-green-dim)", marginBottom: 10 }}>
        Current: <span style={{ color: "var(--term-green)" }}>{agent?.agentCodename ?? "—"}</span>
        {agent?.agentSpecialty && <> · {agent.agentSpecialty}</>}
      </div>
      <button className="term-btn" style={{ fontSize: 11, padding: "7px 16px" }} onClick={regen} disabled={regenerating}>
        <span>{regenerating ? "REGENERATING..." : "REGENERATE IDENTITY"}</span>
      </button>
    </div>
  );
}

function TelegramPanel({
  agentId,
  agent,
  ownerHeaders,
  onUpdate,
}: {
  agentId: string;
  agent: any;
  ownerHeaders: HeadersInit;
  onUpdate: (agent: any) => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "clawcounselBot";

  async function disconnect() {
    setDisconnecting(true);
    const res = await fetch(`${BACKEND_URL}/api/agents/${agentId}/disconnect-telegram`, {
      method: "POST",
      headers: ownerHeaders,
    });
    const data = await res.json();
    if (data.agent) onUpdate(data.agent);
    setDisconnecting(false);
  }

  return (
    <div style={{ marginTop: 14 }}>
      {agent?.telegramChatId ? (
        <>
          <div style={{ fontSize: 12, color: "var(--term-green)", marginBottom: 6 }}>
            Connected to: <span style={{ fontWeight: 600 }}>{agent.telegramChatTitle ?? agent.telegramChatId}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--term-green-dim)", marginBottom: 12 }}>
            Disconnect to link a different Telegram group. Existing knowledge is preserved.
          </div>
          <button
            className="term-btn"
            style={{ fontSize: 11, padding: "7px 16px", borderColor: "#ff4444", color: "#ff4444" }}
            onClick={disconnect}
            disabled={disconnecting}
          >
            <span>{disconnecting ? "DISCONNECTING..." : "DISCONNECT TELEGRAM"}</span>
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--term-amber)", marginBottom: 8 }}>Not connected</div>
          <div style={{ fontSize: 12, color: "var(--term-green-mid)", lineHeight: 1.6 }}>
            Add <span style={{ color: "var(--term-green)" }}>@{botUsername}</span> to your group and send:
          </div>
          <div style={{ fontSize: 13, background: "rgba(0,255,65,0.06)", border: "1px solid var(--term-green-dim)", padding: "8px 12px", letterSpacing: "0.05em", marginTop: 8, wordBreak: "break-all" }}>
            /connect {agentId}
          </div>
        </>
      )}
    </div>
  );
}
