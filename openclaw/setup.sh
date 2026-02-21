#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR/workspace"
OPENCLAW_DIR="$HOME/.openclaw"

echo "▸ Setting up OpenClaw for ClawCounsel..."

mkdir -p "$OPENCLAW_DIR"

cat > "$OPENCLAW_DIR/openclaw.json" << EOF
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-6",
    "skipBootstrap": true
  },
  "agents": {
    "defaults": {
      "workspace": "$WORKSPACE_DIR"
    }
  },
  "tools": {
    "web": {
      "search": { "enabled": true },
      "fetch": { "enabled": true }
    }
  }
}
EOF

echo "▸ Config written to $OPENCLAW_DIR/openclaw.json"
echo "▸ Workspace: $WORKSPACE_DIR"
echo "▸ Done. Run 'openclaw agent --local -m \"hello\"' to test."
