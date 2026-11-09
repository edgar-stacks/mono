#!/usr/bin/env bash

repo="leather-io/mono"
workflow="repo:fix-issue.yml"

run_title() {
  printf 'fix-issue: #%s' "$1"
}

find_run() {
  local issue="$1"
  local since="$2"
  gh run list --repo "$repo" --workflow "$workflow" --event workflow_dispatch --limit 50 \
    --json databaseId,displayTitle,createdAt,status,url |
    jq -c --arg title "$(run_title "$issue")" --argjson since "$since" '
      map(select(.displayTitle == $title and (.createdAt | fromdateiso8601) >= $since))
      | sort_by(.createdAt) | last // empty'
}

record_run() {
  local run_json="$1"
  local issue="$2"
  local run="$3"
  jq --arg issue "$issue" --argjson run "$run" \
    'map(if (.issue | tostring) == $issue then . + {run_id: $run.databaseId, run_url: $run.url,
      branch: ("bot/fix-issue-" + $issue + "-" + ($run.databaseId | tostring))} else . end)' \
    "$run_json" > "$run_json.tmp"
  mv "$run_json.tmp" "$run_json"
}
