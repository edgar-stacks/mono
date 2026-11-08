#!/bin/bash
set -euo pipefail

work_dir="${WORK_DIR:-tmp/fix-issue}"
status_file="${STATUS_FILE:-$work_dir/status.md}"
report_file="${VERIFY_REPORT:-}"
output_log="$work_dir/verify-output.log"
details_file="$work_dir/verify-details.txt"
report_tail_lines=150

. "$(dirname "${BASH_SOURCE[0]}")/fix-issue-status.sh"

function fail() {
  local message="$1"
  local details="${2:-}"
  echo "verify-fix: $message" >&2
  if [ -n "$report_file" ]; then
    mkdir -p "$(dirname "$report_file")"
    {
      echo "FAILED: $message"
      if [ -n "$details" ] && [ -s "$details" ]; then
        echo
        echo '```'
        tail -n "$report_tail_lines" "$details"
        echo '```'
      fi
    } > "$report_file"
  fi
  exit 1
}

function run_check() {
  if ! "$@" 2>&1 | tee "$output_log"; then
    fail "\`$*\` failed" "$output_log"
  fi
}

mkdir -p "$work_dir"

problems=$(status_problems "$status_file")
if [ -n "$problems" ]; then
  echo "$problems" | sed 's/^/  /' >&2
  echo "$problems" > "$details_file"
  fail "$status_file is not a valid fixer status" "$details_file"
fi
state=$(status_value "$status_file" STATE)

collect_changes
if ! report_refused_paths 2> "$details_file"; then
  cat "$details_file" >&2
  fail "the fixer changed files it may not touch" "$details_file"
fi

if [ "$state" = blocked ]; then
  echo "verify-fix: the fixer is blocked with ${#change_paths[@]} changed files; skipping the verification gate"
  exit 0
fi

[ "${#change_paths[@]}" -gt 0 ] || fail "STATE is done but nothing changed"

before=$(tree_snapshot)
run_check pnpm format
after=$(tree_snapshot)
if [ "$before" != "$after" ]; then
  git status --short | tee "$details_file" >&2
  fail "pnpm format changed files the fixer left unformatted" "$details_file"
fi

run_check pnpm lint
run_check pnpm typecheck
run_check pnpm knip
run_check pnpm --filter @leather.io/extension lint:unused-exports
run_check pnpm turbo run test:unit --filter='...[HEAD]'
echo "verify-fix: ${#change_paths[@]} changed files pass the verification gate"
