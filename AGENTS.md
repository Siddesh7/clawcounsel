# AGENTS.md — AI Development Guide for ClawCounsel

This file helps AI coding assistants (Cursor, Claude, Copilot) understand this codebase.

## What Is ClawCounsel?

An AI legal counsel SaaS. Companies subscribe, deploy an AI agent, upload legal documents, and get continuous legal risk monitoring via Telegram.

## Monorepo Layout

```
clawcounsel/
  frontend/           ← The entire app (Next.js 16, App Router)
    app/              ← Pages + API routes
      api/            ← All server-side logic (REST endpoints)
      dashboard/      ← Agent list + detail pages
      deploy/         ← Agent deployment + OG payment
      onboarding/     ← Company onboarding flow
    lib/
      db/             ← SQLite + Drizzle ORM (schema + connection)
      services/       ← Business logic (AI agent, identity gen, ingestion)
      constants.ts    ← Shared constants (OG chain, addresses)
    components/ui/    ← shadcn components
    data/             ← SQLite database file (gitignored)
  openclaw/
    workspace/        ← OpenClaw agent workspace
      AGENTS.md       ← Agent persona (read by OpenClaw at runtime)
      COMPANY_CONTEXT.md ← Per-company context (generated during onboarding)
      documents/      ← Uploaded legal documents (text extracted from PDFs)
      skills/         ← Custom agent skills (legal-analysis, contract-monitor, copyright-watch)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom terminal theme in globals.css |
| Components | shadcn/ui |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI Engine | ClawCounsel Agent (OpenClaw CLI primary) + Anthropic Claude SDK (fallback) |
| Wallet | Privy (embedded EVM wallets) |
| Payments | Native OG token on 0G Mainnet via viem |
| Communication | Telegram Bot API |

## Key Patterns

### API Routes (app/api/)
- All server logic is Next.js API route handlers — no separate backend
- Params are async in Next.js 16: `const { id } = await params`
- Return `NextResponse.json()` for all responses
- File uploads use native `Request.formData()`

### Database (lib/db/)
- SQLite with Drizzle ORM — tables auto-create on startup
- UUIDs as text primary keys with `crypto.randomUUID()`
- Timestamps stored as integer milliseconds
- Schema in `schema.ts`, connection + table creation in `index.ts`

### AI Agent (lib/services/agent.ts)
- Primary: spawns `openclaw agent --local` via `child_process.spawn`
- Fallback: direct Anthropic SDK calls if OpenClaw unavailable
- Session ID = agent UUID (gives persistent memory per company)
- Context prefix includes company name, agent codename, tone, specialty

### Terminal UI (app/**/*.tsx)
- Green-on-black terminal aesthetic — do NOT use standard modern UI patterns
- CSS variables for theming (`--term-green`, `--term-bg`, `--term-amber`)
- Inline styles with CSS vars, not Tailwind color classes
- VT323 font for headings, IBM Plex Mono for body
- ASCII symbols only (no emojis): ▸ ● ○ ← →

## Common Tasks

### Add a new API endpoint
1. Create `app/api/{path}/route.ts`
2. Export named functions: `GET`, `POST`, `PUT`, `DELETE`
3. Import db from `@/lib/db`, schema from `@/lib/db/schema`

### Add a new DB table
1. Add `sqliteTable()` to `lib/db/schema.ts`
2. Add matching `CREATE TABLE IF NOT EXISTS` to `lib/db/index.ts`
3. No migration command needed

### Add a new page
1. Create `app/{route}/page.tsx`
2. Use terminal UI patterns from existing pages
3. Keep under 120 lines — extract components if needed

### Add an OpenClaw skill
1. Create `openclaw/workspace/skills/{name}/SKILL.md`
2. Follow the format of existing skills in that directory

## Environment Variables

Create `frontend/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...           # Claude API key (identity gen + AI fallback)
NEXT_PUBLIC_PRIVY_APP_ID=...           # from privy.io dashboard (wallet connection)
NEXT_PUBLIC_TREASURY_ADDRESS=0x...     # your wallet for receiving OG payments
TELEGRAM_BOT_TOKEN=...                 # from @BotFather
TELEGRAM_BOT_USERNAME=clawcounselBot   # your bot's username (without @)
WEBHOOK_SECRET=some-secret-string      # any string, used to verify Telegram webhooks
```

For 0G INFT (testnet): set `NEXT_PUBLIC_0G_EXPLORER_URL` to the testnet explorer (`https://chainscan-galileo.0g.ai`) so "View on explorer" and tx links open on the correct network. Mainnet default is `https://chainscan.0g.ai`.

## Running Locally

```bash
# 1. Install dependencies
cd frontend
pnpm install

# 2. Start the dev server
pnpm dev
# App at http://localhost:3000 — DB auto-creates on first request

# 3. Start a tunnel (needed for Telegram webhooks)
# In a second terminal:
cloudflared tunnel --url http://localhost:3000
# Copy the https://xxx.trycloudflare.com URL from the output

# 4. Register the webhook with Telegram
# Replace YOUR_BOT_TOKEN and YOUR_TUNNEL_URL:
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR_TUNNEL_URL/api/telegram/webhook&secret_token=YOUR_WEBHOOK_SECRET"

# You must re-run step 4 every time the tunnel URL changes (every restart).
```

## Useful Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server on :3000 |
| `pnpm db:wipe` | Delete DB + extracted docs, start fresh |
| `pnpm db:summary` | Quick overview of all tables |
| `pnpm db:show` | Interactive SQLite shell |

## Telegram Bot Commands

| Command | What it does |
|---------|-------------|
| `/connect {agentId}` | Link this group to an agent (get ID from dashboard) |
| `/ask {question}` | Ask the agent a legal question |
| `/remember {info}` | Add a fact to the agent's knowledge base |
| Drop a PDF | Auto-extracts and stores the document |
