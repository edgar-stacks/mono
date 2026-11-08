#!/bin/bash
set -euo pipefail

mode="${1:-}"
work_dir="${WORK_DIR:-tmp/fix-issue}"
status_file="${STATUS_FILE:-$work_dir/status.md}"
review_file="${REVIEW_FILE:-$work_dir/review.md}"
snapshot_file="${SNAPSHOT_FILE:-$work_dir/review-snapshot.txt}"
output_file="${GITHUB_OUTPUT:-/dev/null}"

. "$(dirname "${BASH_SOURCE[0]}")/fix-issue-status.sh"

function fail() {
  echo "review-fix: $*" >&2
  exit 1
}

function blocking_count() {
  awk 'index($0, "BLOCKING:") == 1 { sub(/^BLOCKING:[ \t]*/, ""); print; exit }' "$review_file"
}

function blocking_bullets() {
  awk '
    /^## / { inside = ($0 == "## Blocking"); next }
    inside && /^- / { count++ }
    END { print count + 0 }
  ' "$review_file"
}

function add_review_bullet() {
  local bullet="$1"
  local updated="$status_file.tmp"
  awk -v bullet="$bullet" '{ print } index($0, "TESTED:") == 1 { print bullet }' "$status_file" > "$updated"
  mv "$updated" "$status_file"
}

case "$mode" in
  snapshot)
    mkdir -p "$work_dir"
    tree_snapshot > "$snapshot_file"
    state=""
    if [ -f "$status_file" ]; then
      state=$(status_value "$status_file" STATE)
    fi
    echo "state=$state" >> "$output_file"
    echo "review-fix: fixer state is '${state:-missing}'"
    ;;
  check)
    [ -f "$snapshot_file" ] || fail "$snapshot_file does not exist; run the snapshot step first"
    if [ "$(tree_snapshot)" != "$(cat "$snapshot_file")" ]; then
      git status --short >&2
      fail "the review changed files; it may only write $review_file"
    fi
    [ -f "$review_file" ] || fail "$review_file does not exist"
    count=$(blocking_count)
    [[ "$count" =~ ^[0-9]+$ ]] || fail "BLOCKING: '$count' is not a number"
    listed=$(blocking_bullets)
    [ "$count" = "$listed" ] || fail "BLOCKING: says $count but ## Blocking lists $listed findings"
    if [ "$(status_value "$status_file" STATE)" = done ]; then
      add_review_bullet "- Code review: $count critical, blocker or regression findings"
    fi
    echo "blocking=$count" >> "$output_file"
    echo "review-fix: $count blocking findings"
    ;;
  *)
    echo "usage: fix-issue-review.sh snapshot|check" >&2
    exit 2
    ;;
esac
