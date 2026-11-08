#!/bin/bash
set -euo pipefail

repo="$GITHUB_REPOSITORY"
issue="$ISSUE"
out_dir="${OUT_DIR:-tmp/fix-issue}"

function fail() {
  echo "fetch-issue: $*" >&2
  exit 1
}

[[ "$issue" =~ ^[1-9][0-9]*$ ]] || fail "'$issue' is not an issue number"
mkdir -p "$out_dir"

if ! gh api "repos/$repo/issues/$issue" > "$out_dir/issue-only.json" 2> "$out_dir/fetch-error.log"; then
  fail "issue #$issue was not found in $repo"
fi
if jq -e 'has("pull_request")' "$out_dir/issue-only.json" > /dev/null; then
  fail "#$issue is a pull request, not an issue"
fi
if [ "$(jq -r '.state' "$out_dir/issue-only.json")" != open ]; then
  fail "issue #$issue is closed"
fi

gh api --paginate "repos/$repo/issues/$issue/comments" | jq -s 'add // []' > "$out_dir/comments.json"
jq --slurpfile comments "$out_dir/comments.json" '. + {comments: $comments[0]}' \
  "$out_dir/issue-only.json" > "$out_dir/issue.json"
rm -f "$out_dir/issue-only.json" "$out_dir/comments.json" "$out_dir/fetch-error.log"

jq -r '
  def text: if . == null or . == "" then "(empty)" else . end;
  "# \(.title)",
  "",
  .html_url,
  "",
  "Labels: \(if (.labels | length) == 0 then "none" else (.labels | map(.name) | join(", ")) end)",
  "Opened by @\(.user.login) on \(.created_at)",
  "",
  "## Body",
  "",
  (.body | text),
  "",
  "## Comments",
  "",
  (if (.comments | length) == 0 then "none" else
    (.comments | map("### @\(.user.login) on \(.created_at)\n\n\(.body | text)") | join("\n\n")) end)
' "$out_dir/issue.json" > "$out_dir/issue.md"
echo "fetch-issue: wrote $out_dir/issue.md with $(jq '.comments | length' "$out_dir/issue.json") comments"
