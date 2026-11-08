#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$script_dir/lib/runs.sh"

usage() {
  cat <<'EOF'
Usage: dispatch.sh --run-dir <dir> --issue <n> [--branch <branch>] [--brief <file>] [--dry-run]

Dispatches the repo:issue-fix workflow on dev for one brief: the issue as `issue`, the brief
verbatim as `notes`, sent as JSON on standard input to `gh workflow run --json`, so the brief never
lands on a command line. Then finds the run (from the URL gh prints, or by polling gh run list for
the "issue-fix: #<n>" title created after the dispatch) and records run_id, run_url and
dispatched_at in <run-dir>/run.json. Dispatching the same issue again replaces its run.

  --issue    the issue the workflow fixes; for a group, the first issue of the brief
  --branch   the pull request branch, default bot/issue-fix-<issue> (the workflow's own choice)
  --brief    default <run-dir>/briefs/<branch>.md
  --dry-run  check the brief and print the commands; dispatch nothing

Refuses a brief over 60000 bytes (GitHub caps the inputs payload at 65535 characters). Exits 3
when GitHub refuses the dispatch, after printing the brief path and the manual command.
EOF
}

run_dir=""
issue=""
branch=""
brief=""
dry_run=0
max_brief_bytes=60000
max_payload_chars=65535
poll_attempts=12
poll_seconds=5

while [ $# -gt 0 ]; do
  case "$1" in
    --run-dir) run_dir="$2"; shift 2 ;;
    --issue) issue="$2"; shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    --brief) brief="$2"; shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'error: unknown argument %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

[ -n "$run_dir" ] || { usage >&2; exit 2; }
[ -n "$issue" ] || { usage >&2; exit 2; }
[[ "$issue" =~ ^[1-9][0-9]*$ ]] || die "--issue must be an issue number"
branch="${branch:-bot/issue-fix-$issue}"
brief="${brief:-$run_dir/briefs/$branch.md}"
command -v jq >/dev/null || die "jq is required"
command -v gh >/dev/null || die "gh is required"
run_json="$run_dir/run.json"
[ -f "$run_json" ] || die "run.json not found in $run_dir"
[ -f "$brief" ] || die "brief not found: $brief"

brief_bytes="$(wc -c < "$brief" | tr -d '[:space:]')"
[ "$brief_bytes" -le "$max_brief_bytes" ] ||
  die "$brief is $brief_bytes bytes; the cap is $max_brief_bytes (see references/brief.md)"

payload() {
  jq -n --arg issue "$issue" --rawfile notes "$brief" '{issue: $issue, notes: $notes}'
}

payload_chars="$(payload | jq -c '.' | wc -m | tr -d '[:space:]')"
[ "$payload_chars" -le "$max_payload_chars" ] ||
  die "the encoded inputs are $payload_chars characters; GitHub accepts $max_payload_chars"

manual_command() {
  printf "jq -n --arg issue %s --rawfile notes '%s' '{issue: \$issue, notes: \$notes}' |\n" "$issue" "$brief"
  printf "  gh workflow run '%s' --repo %s --ref dev --json\n" "$workflow" "$repo"
}

printf 'brief %s: %s bytes, %s characters of inputs\n' "$brief" "$brief_bytes" "$payload_chars"
if [ "$dry_run" = 1 ]; then
  printf '+ '
  manual_command
  printf "+ gh run list --repo %s --workflow '%s' --event workflow_dispatch  # until '%s' appears\n" \
    "$repo" "$workflow" "$(run_title "$issue")"
  printf '+ record run_id, run_url and dispatched_at for #%s in %s\n' "$issue" "$run_json"
  exit 0
fi

issues="$( { grep -oE '^# #[0-9]+:' "$brief" || true; } | { grep -oE '[0-9]+' || true; } |
  awk '!seen[$0]++' | jq -R 'tonumber' | jq -s '.')"
since="$(($(date -u +%s) - 10))"
dispatched_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if ! output="$(payload | gh workflow run "$workflow" --repo "$repo" --ref dev --json 2>&1)"; then
  printf '%s\n' "$output" >&2
  printf '\nGitHub refused the dispatch. Brief: %s\nSomeone with write access to %s can run:\n' "$brief" "$repo" >&2
  manual_command >&2
  exit 3
fi

jq --arg issue "$issue" --arg branch "$branch" --arg brief "$brief" --arg at "$dispatched_at" \
  --argjson since "$since" --argjson issues "$issues" '
  (map(select((.issue | tostring) == $issue)) | .[0].dispatches // 0) as $count
  | map(select((.issue | tostring) != $issue))
  + [{issue: ($issue | tonumber), issues: (if ($issues | length) == 0 then [$issue | tonumber] else $issues end),
      branch: $branch, brief: $brief, dispatched_at: $at, dispatched_epoch: $since,
      dispatches: ($count + 1), run_id: null, run_url: null}]' "$run_json" > "$run_json.tmp"
mv "$run_json.tmp" "$run_json"

run=""
url="$(printf '%s\n' "$output" | grep -oE 'https://github\.com/[^ ]+/actions/runs/[0-9]+' | head -n 1 || true)"
if [ -n "$url" ]; then
  run="$(jq -n --arg url "$url" '{databaseId: ($url | split("/") | last | tonumber), url: $url}')"
fi
attempt=0
while [ -z "$run" ] && [ "$attempt" -lt "$poll_attempts" ]; do
  sleep "$poll_seconds"
  run="$(find_run "$issue" "$since")"
  attempt=$((attempt + 1))
done
if [ -z "$run" ]; then
  printf 'dispatched #%s, but its run has not appeared yet; status.sh looks it up later\n' "$issue"
  exit 0
fi
record_run "$run_json" "$issue" "$run"
printf 'dispatched #%s: %s\n' "$issue" "$(printf '%s' "$run" | jq -r '.url')"
