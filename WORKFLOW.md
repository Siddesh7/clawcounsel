# ClawCounsel — Architecture & Workflow

## What Is This

ClawCounsel is a SaaS platform where companies subscribe to deploy their own **OpenClaw** AI legal counsel agent. Each agent is a dedicated instance that learns from the company's Telegram group, ingests documents, monitors for legal risks, and answers legal questions in natural language.

The core ownership primitive is an **iNFT** (from OG Labs) — when a company subscribes, an NFT is minted that represents their ownership of that specific agent instance.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  / (landing)  →  /deploy  →  /onboarding  →  /dashboard   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (same-origin fetch)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS FRONTEND  (port 3000)                  │
│                                                             │
│  app/api/[...path]/route.ts  ← catch-all API proxy         │
│  app/api/telegram/webhook/   ← Telegram webhook proxy      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (server-side, localhost)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FASTIFY BACKEND  (port 3001)                   │
│                                                             │
│  /api/agents          → agent CRUD, onboarding data        │
│  /api/telegram/*      → webhook handler, set-webhook       │
│  /api/documents/*     → document upload per agent          │
│                                                             │
│  services/ingestion.ts  → store Telegram messages in DB    │
│  services/agent.ts      → Claude Q&A + monitoring sweep    │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌─────────────────────┐   ┌──────────────────────┐
│   NEON POSTGRES     │   │   ANTHROPIC CLAUDE   │
│                     │   │   claude-sonnet-4-6  │
│  agents             │   │                      │
│  onboarding_data    │   │  - Q&A (RAG over     │
│  knowledge_items    │   │    knowledge_items)  │
│  conversations      │   │  - monitoring sweep  │
│  documents          │   │    → alerts table    │
│  alerts             │   └──────────────────────┘
└─────────────────────┘
```

---

## User Flow (Current)

```
1. DEPLOY
   └── Company fills: company name, company ID, wallet address
   └── POST /api/agents → agent row created (status: pending)

2. ONBOARDING — Legal Claim Intake
   └── 5 questions: claim type, opposing party, GitHub target, evidence
   └── POST /api/agents/:id/onboarding → onboarding_data row saved

3. TELEGRAM CONNECT
   └── User adds @ClawCounselBot to their Telegram group
   └── Sends: /connect {agentId}
   └── Bot links telegram_chat_id to agent → status: active
   └── Auto-polls frontend → redirects to dashboard on connect

4. LIVE AGENT
   └── Every Telegram message → ingested into knowledge_items
   └── /ask {question} or @ClawCounselBot mention → Claude answers
   └── Context = onboarding claim data + relevant knowledge_items
   └── Conversation history stored in conversations table
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `agents` | One row per deployed OpenClaw instance. Holds telegram_chat_id, status, wallet |
| `onboarding_data` | Legal claim context per agent (claim type, opposing party, evidence) |
| `knowledge_items` | Everything the agent learns — Telegram messages, future: docs, GitHub |
| `conversations` | Q&A memory per agent/user for multi-turn context |
| `documents` | Uploaded PDFs, GitHub repos, text files (ingestion pipeline pending) |
| `alerts` | Legal risk signals surfaced by monitoring sweep |

---

## Telegram Bot Flow

```
User message in group
        │
        ▼
ngrok → Next.js /api/telegram/webhook (proxy)
        │
        ▼
Fastify /api/telegram/webhook
        │
        ├── /connect {agentId}  → link chat to agent, welcome message
        │
        ├── all messages        → ingestTelegramMessage() → knowledge_items
        │
        └── /ask or @mention    → askAgent()
                                    │
                                    ├── retrieve relevant knowledge_items (keyword search)
                                    ├── load onboarding claim context
                                    ├── load last 10 conversation turns
                                    └── Claude claude-sonnet-4-6 → reply in chat
```

---

## Pending / TODO

### iNFT — OG Labs Integration
- [ ] Mint an iNFT on agent deploy (`POST /api/agents`)
- [ ] Store `nft_token_id` and `wallet_address` on the agent row
- [ ] Display NFT ownership proof on dashboard

### Kite Integration
- [ ] Wire Kite for whatever role it plays (TBD — monitoring? inference?)

### Monitoring & Alerts
- [ ] Scheduled cron job to run `runMonitoringSweep()` per active agent
- [ ] Push alerts to Telegram group when a risk is detected
- [ ] Dashboard alerts panel (currently shows empty state)
- [ ] Alert types: payment overdue, contract breach, vendor SLA, copyright, deadlines
---

## Local Dev Setup

```bash
# 1. Start ngrok (tunnels frontend to public HTTPS)
ngrok http 3000

# 2. Update backend/.env
FRONTEND_URL=https://{ngrok-url}
BACKEND_URL=https://{ngrok-url}

# 3. Register Telegram webhook
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://{ngrok-url}/api/telegram/webhook","allowed_updates":["message"]}'

# 4. Start backend
cd backend && bun dev

# 5. Start frontend
cd frontend && bun dev
```

---

## Key Files

| File | Role |
|---|---|
| `backend/src/routes/telegram.ts` | Telegram webhook, /connect command, message routing |
| `backend/src/services/agent.ts` | Claude Q&A + monitoring sweep |
| `backend/src/services/ingestion.ts` | Store + retrieve knowledge from DB |
| `backend/src/db/schema.ts` | Full database schema |
| `frontend/app/api/[...path]/route.ts` | Catch-all proxy (fixes CORS + mixed content) |
| `frontend/app/onboarding/page.tsx` | Legal intake + Telegram connect flow |
| `frontend/app/dashboard/page.tsx` | Claims list |
| `frontend/app/dashboard/[agentId]/page.tsx` | Per-agent detail + alerts |
