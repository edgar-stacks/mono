#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$script_dir/lib/runs.sh"

usage() {
  cat <<'EOF'
Usage: status.sh --run-dir <dir> [--watch] [--interval <seconds>] [--dry-run]

Prints one row per entry in <run-dir>/run.json: the issues, the branch, the repo:issue-fix run's
status and conclusion (gh run view), the pull request on the branch (gh pr list --state all) with
its number, state and draft flag, and the run and pull request URLs. Below the table, the
## Blocked questions of every draft pull request. An entry dispatched before its run appeared is
looked up by its "issue-fix: #<n>" title first and recorded in run.json.

  --watch     repeat until every run has completed
  --interval  seconds between rounds with --watch, default 60
  --dry-run   print the gh commands the table would run; run none

Exits 1 when a run concluded with anything other than success, 0 otherwise.
EOF
}

run_dir=""
watch=0
interval=60
dry_run=0

while [ $# -gt 0 ]; do
  case "$1" in
    --run-dir) run_dir="$2"; shift 2 ;;
    --watch) watch=1; shift ;;
    --interval) interval="$2"; shift 2 ;;
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
[[ "$interval" =~ ^[1-9][0-9]*$ ]] || die "--interval must be a number of seconds"
command -v jq >/dev/null || die "jq is required"
run_json="$run_dir/run.json"
[ -f "$run_json" ] || die "run.json not found in $run_dir"
[ "$dry_run" = 1 ] || command -v gh >/dev/null || die "gh is required"

field() {
  jq -r --argjson i "$1" --arg f "$2" '.[$i][$f] // empty | if type == "array" then map(tostring) | join(",") else tostring end' "$run_json"
}

show() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

blocked_questions() {
  printf '%s\n' "$1" | awk '/^## /{inside = ($0 == "## Blocked"); next} inside && /^- /'
}

round() {
  local count i issue branch run_id run pr status conclusion url epoch pr_text questions incomplete failed
  count="$(jq 'length' "$run_json")"
  incomplete=0
  failed=0
  questions=""
  printf '%-10s %-16s %-12s %-10s %-14s %s\n' ISSUES BRANCH RUN RESULT PR URL
  i=0
  while [ "$i" -lt "$count" ]; do
    issue="$(field "$i" issue)"
    branch="$(field "$i" branch)"
    run_id="$(field "$i" run_id)"
    if [ "$dry_run" = 1 ]; then
      show gh run view "${run_id:-<run id>}" --repo "$repo" --json status,conclusion,url >&2
      show gh pr list --repo "$repo" --head "$branch" --state all --json number,url,isDraft,title,state,body >&2
      i=$((i + 1))
      continue
    fi
    if [ -z "$run_id" ]; then
      epoch="$(field "$i" dispatched_epoch)"
      run="$(find_run "$issue" "${epoch:-0}")"
      if [ -n "$run" ]; then
        record_run "$run_json" "$issue" "$run"
        run_id="$(printf '%s' "$run" | jq -r '.databaseId')"
        branch="bot/issue-fix-$issue-$run_id"
      fi
    fi
    status="not found"
    conclusion="-"
    url="-"
    if [ -n "$run_id" ]; then
      run="$(gh run view "$run_id" --repo "$repo" --json status,conclusion,url)"
      status="$(printf '%s' "$run" | jq -r '.status')"
      conclusion="$(printf '%s' "$run" | jq -r '.conclusion // "" | if . == "" then "-" else . end')"
      url="$(printf '%s' "$run" | jq -r '.url')"
    fi
    if [ "$status" != completed ]; then
      incomplete=1
    elif [ "$conclusion" != success ]; then
      failed=1
    fi
    pr=""
    if [ -n "$branch" ]; then
      pr="$(gh pr list --repo "$repo" --head "$branch" --state all --limit 1 \
        --json number,url,isDraft,title,state,body --jq '.[0] // empty')"
    fi
    pr_text="-"
    if [ -n "$pr" ]; then
      pr_text="$(printf '%s' "$pr" | jq -r '"#\(.number) \(.state | ascii_downcase)\(if .isDraft then " draft" else "" end)"')"
      if [ "$(printf '%s' "$pr" | jq -r '.isDraft')" = true ]; then
        questions="$questions"$'\n'"#$issue $(printf '%s' "$pr" | jq -r '.url')"$'\n'"$(blocked_questions "$(printf '%s' "$pr" | jq -r '.body')")"$'\n'
      fi
    fi
    printf '%-10s %-16s %-12s %-10s %-14s %s\n' "$(field "$i" issues)" "$branch" "$status" "$conclusion" "$pr_text" "$url"
    if [ -n "$pr" ]; then
      printf '%-10s %-16s %-12s %-10s %-14s %s\n' "" "" "" "" "" "$(printf '%s' "$pr" | jq -r '.url')"
    fi
    i=$((i + 1))
  done
  if [ -n "$questions" ]; then
    printf '\nBlocked, waiting for answers (section 8):\n%s' "$questions"
  fi
  round_incomplete="$incomplete"
  round_failed="$failed"
}

round_incomplete=0
round_failed=0
round
while [ "$watch" = 1 ] && [ "$dry_run" = 0 ] && [ "$round_incomplete" = 1 ]; do
  sleep "$interval"
  printf '\n%s\n' "$(date '+%H:%M:%S')"
  round
done
exit "$round_failed"
