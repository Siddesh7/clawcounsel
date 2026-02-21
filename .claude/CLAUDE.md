# Claude Code Instructions for ClawCounsel

Read `AGENTS.md` in the repo root for full project context.

## Quick Reference

- **Single app**: Everything is in `frontend/` — Next.js 16 with API routes, SQLite, ClawCounsel agent (OpenClaw runtime)
- **Run**: `cd frontend && pnpm dev`
- **Package manager**: pnpm (not npm or yarn)
- **DB**: SQLite at `frontend/data/clawcounsel.db` — auto-creates, no setup
- **AI**: ClawCounsel agent (OpenClaw CLI) primary, Anthropic SDK fallback

## Code Style

- TypeScript strict, kebab-case files
- Component files under 120 lines
- Terminal UI: green-on-black, monospace, inline styles with CSS variables
- No emojis in UI code — ASCII only
- API routes use `NextResponse.json()`, async `params`

## File Locations

- API routes: `frontend/app/api/`
- Pages: `frontend/app/`
- DB schema: `frontend/lib/db/schema.ts`
- Services: `frontend/lib/services/`
- OpenClaw config: `openclaw/workspace/`
