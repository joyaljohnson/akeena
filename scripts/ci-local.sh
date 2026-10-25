#!/usr/bin/env bash
# Runs the same steps as .github/workflows/deploy.yml with every gitignored private file hidden,
# so a missing fixture or env file fails here instead of silently breaking the deploy.
# Run: npm run ci:local
set -uo pipefail
cd "$(dirname "$0")/.."

HIDE="$(mktemp -d)"
PRIVATE=(src/dev-fixture supabase/seed.private.sql .env.local .env letter-content.md dist)

restore() {
  for p in "${PRIVATE[@]}"; do
    [ -e "$HIDE/$p" ] && mkdir -p "$(dirname "$p")" && mv "$HIDE/$p" "$p"
  done
  rm -rf "$HIDE"
}
trap restore EXIT

for p in "${PRIVATE[@]}"; do
  if [ -e "$p" ]; then mkdir -p "$HIDE/$(dirname "$p")" && mv "$p" "$HIDE/$p"; fi
done

fail=0
run() { echo "--- $*"; "$@" || { echo "FAILED: $*"; fail=1; return 1; }; }

run npm run typecheck && run npm run lint && run npm test && \
  VITE_BASE_PATH=/akeena/ run npm run build
exit $fail
