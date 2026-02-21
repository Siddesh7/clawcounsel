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
      deploy/         ← Agent deployment + USDC payment
      onboarding/     ← Company onboarding flow
    lib/
      db/             ← SQLite + Drizzle ORM (schema + connection)
      services/       ← Business logic (AI agent, identity gen, ingestion)
      constants.ts    ← Shared constants (USDC, addresses)
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
| Payments | USDC on Base Mainnet via viem |
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

Required in `frontend/.env.local`:
- `ANTHROPIC_API_KEY` — Claude API key for identity gen + fallback
- `TELEGRAM_BOT_TOKEN` — from BotFather (optional for local dev)
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy dashboard
- `NEXT_PUBLIC_TREASURY_ADDRESS` — USDC recipient wallet

## Running

```bash
cd frontend
pnpm install
pnpm dev
# Visit http://localhost:3000
```

No database setup. No separate backend. SQLite creates itself on first request.
