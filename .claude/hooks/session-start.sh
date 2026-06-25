#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Installs the JavaScript dependencies so the Vite dev server, the linter,
# and the production build work in remote sessions.
#
# Uses npm (package-lock.json) rather than bun: the committed bun.lockb pins
# most packages to a private Lovable registry (europe-west4-npm.pkg.dev) that
# is not reachable from web sessions, whereas package-lock.json resolves
# everything from registry.npmjs.org.
set -euo pipefail

# Only run inside the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Idempotent: skip when dependencies are already present (cached container).
if [ -d node_modules ] && [ -n "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Dependencies already installed; skipping npm install."
  exit 0
fi

echo "Installing npm dependencies..."
npm install --no-audit --no-fund
echo "Dependency installation complete."
