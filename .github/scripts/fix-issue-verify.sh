#!/bin/bash
set -euo pipefail

status_file="${STATUS_FILE:-tmp/fix-issue/status.md}"

. "$(dirname "${BASH_SOURCE[0]}")/fix-issue-status.sh"

function fail() {
  echo "verify-fix: $*" >&2
  exit 1
}

function snapshot() {
  git status --porcelain=v1 --untracked-files=all
  git diff --binary HEAD | git hash-object --stdin
  git ls-files --others --exclude-standard | git hash-object --stdin-paths
}

problems=$(status_problems "$status_file")
if [ -n "$problems" ]; then
  echo "$problems" | sed 's/^/  /' >&2
  fail "$status_file is not a valid fixer status"
fi
state=$(status_value "$status_file" STATE)

collect_changes
report_refused_paths || fail "the fixer changed files it may not touch"

if [ "$state" = blocked ]; then
  echo "verify-fix: the fixer is blocked with ${#change_paths[@]} changed files; skipping the verification gate"
  exit 0
fi

[ "${#change_paths[@]}" -gt 0 ] || fail "STATE is done but nothing changed"

before=$(snapshot)
pnpm format
after=$(snapshot)
if [ "$before" != "$after" ]; then
  git status --short >&2
  fail "pnpm format changed files the fixer left unformatted"
fi

pnpm lint
pnpm typecheck
pnpm knip
pnpm --filter @leather.io/extension lint:unused-exports
pnpm turbo run test:unit --filter='...[HEAD]'
echo "verify-fix: ${#change_paths[@]} changed files pass the verification gate"
