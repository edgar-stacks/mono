#!/bin/bash
set -euo pipefail

mode="${1:-}"
round="${2:-}"
script_dir="$(dirname "${BASH_SOURCE[0]}")"
work_dir="${WORK_DIR:-tmp/fix-issue}"
status_file="${STATUS_FILE:-$work_dir/status.md}"
verify_file="$work_dir/verify.md"
review_file="$work_dir/review.md"
snapshot_file="$work_dir/review-snapshot.txt"
rounds_dir="$work_dir/rounds"
output_file="${GITHUB_OUTPUT:-/dev/null}"

. "$script_dir/fix-issue-status.sh"

function fail() {
  echo "fix-round: $*" >&2
  exit 1
}

function require_round() {
  [[ "$round" =~ ^[1-9]$ ]] || fail "'$round' is not a round number from 1 to 9"
}

function current_state() {
  if [ -f "$status_file" ]; then
    status_value "$status_file" STATE
  fi
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

function last_round() {
  local dir number best=""
  for dir in "$rounds_dir"/*/; do
    [ -d "$dir" ] || continue
    number=$(basename "$dir")
    [[ "$number" =~ ^[0-9]+$ ]] || continue
    if [ -z "$best" ] || [ "$number" -gt "$best" ]; then
      best="$number"
    fi
  done
  echo "$best"
}

function insert_after_key() {
  local key="$1"
  local lines="$2"
  local updated="$status_file.tmp"
  if grep -q "^$key:" "$status_file"; then
    STATUS_KEY="$key:" STATUS_LINES="$lines" awk '
      { print }
      index($0, ENVIRON["STATUS_KEY"]) == 1 { print ENVIRON["STATUS_LINES"] }
    ' "$status_file" > "$updated"
    mv "$updated" "$status_file"
  else
    printf '%s:\n%s\n' "$key" "$lines" >> "$status_file"
  fi
}

case "$mode" in
  begin)
    require_round
    rm -f "$verify_file" "$review_file" "$snapshot_file"
    mkdir -p "$rounds_dir/$round"
    state=$(current_state)
    echo "state=$state" >> "$output_file"
    echo "fix-round: round $round fixer state is '${state:-missing}'"
    ;;
  verify)
    require_round
    if VERIFY_REPORT="$verify_file" STATUS_FILE="$status_file" WORK_DIR="$work_dir" \
      bash "$script_dir/fix-issue-verify.sh"; then
      rm -f "$verify_file"
      echo "verified=true" >> "$output_file"
    else
      [ -s "$verify_file" ] || echo "FAILED: the verification gate failed" > "$verify_file"
      echo "verified=false" >> "$output_file"
    fi
    ;;
  snapshot)
    tree_snapshot > "$snapshot_file"
    ;;
  check-review)
    require_round
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
    echo "blocking=$count" >> "$output_file"
    echo "fix-round: round $round review found $count blocking findings"
    ;;
  end)
    require_round
    mkdir -p "$rounds_dir/$round"
    state=$(current_state)
    if [ "$state" = blocked ]; then
      outcome=blocked
      summary="Round $round: the fixer stopped as blocked"
    elif [ -f "$verify_file" ]; then
      outcome=failed
      summary="Round $round: $(head -n 1 "$verify_file" | sed 's/^FAILED: //')"
    elif [ -f "$review_file" ] && [ "$(blocking_count)" != 0 ]; then
      outcome=failed
      summary="Round $round: review found $(blocking_count) critical, blocker or regression findings"
    elif [ -f "$review_file" ]; then
      outcome=clean
      summary="Round $round: checks passed and review found no critical, blocker or regression findings"
    else
      fail "round $round has neither a verify report nor a review"
    fi
    for file in "$verify_file" "$review_file"; do
      if [ -f "$file" ]; then
        cp "$file" "$rounds_dir/$round/"
      fi
    done
    echo "$outcome" > "$rounds_dir/$round/outcome"
    echo "$summary" > "$rounds_dir/$round/summary"
    clean=false
    continue_rounds=false
    [ "$outcome" = clean ] && clean=true
    [ "$outcome" = failed ] && continue_rounds=true
    {
      echo "outcome=$outcome"
      echo "clean=$clean"
      echo "continue=$continue_rounds"
    } >> "$output_file"
    echo "fix-round: $summary"
    ;;
  finish)
    last=$(last_round)
    [ -n "$last" ] || fail "no round ran"
    [ -f "$status_file" ] || fail "the fixer never wrote $status_file"
    outcome=$(cat "$rounds_dir/$last/outcome")
    bullets=""
    number=1
    while [ "$number" -le "$last" ]; do
      if [ -f "$rounds_dir/$number/summary" ]; then
        bullets="$bullets- $(cat "$rounds_dir/$number/summary")"$'\n'
      fi
      number=$((number + 1))
    done
    insert_after_key TESTED "${bullets%$'\n'}"
    if [ "$outcome" = failed ]; then
      updated="$status_file.tmp"
      sed 's/^STATE:.*/STATE: blocked/' "$status_file" > "$updated"
      mv "$updated" "$status_file"
      insert_after_key QUESTIONS "- The fix still fails after $last rounds ($(cat "$rounds_dir/$last/summary" | sed 's/^Round [0-9]*: //')). Options: dispatch again with guidance in the brief; take the branch over locally."
    fi
    echo "outcome=$outcome" >> "$output_file"
    echo "fix-round: finished after $last rounds with outcome $outcome"
    ;;
  *)
    echo "usage: fix-issue-round.sh begin|verify|snapshot|check-review|end <round> | finish" >&2
    exit 2
    ;;
esac
