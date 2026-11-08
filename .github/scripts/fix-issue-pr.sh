#!/bin/bash
set -euo pipefail

repo="$GITHUB_REPOSITORY"
issue="$ISSUE"
branch="$BRANCH"
base_branch="$BASE_BRANCH"
status_file="$STATUS_FILE"
parent_sha="$PARENT_SHA"
patch_file="${PATCH_FILE:-}"
work_dir="${WORK_DIR:-tmp/fix-issue}"
body="$work_dir/pull-request-body.md"
screenshots_dir="${SCREENSHOTS_DIR:-$work_dir/screenshots}"
screenshots_branch="${SCREENSHOTS_BRANCH:-bot/screenshots}"
max_screenshots=12
max_screenshot_bytes=1048576
screenshot_id_pattern='^[a-z0-9][a-z0-9-]{0,62}$'
png_signature=89504e470d0a1a0a
screenshot_table=""

. "$(dirname "${BASH_SOURCE[0]}")/fix-issue-status.sh"

function fail() {
  echo "open-pull-request: $*" >&2
  exit 1
}

function check_patch_paths() {
  local record path refused=""
  while IFS= read -r -d '' record; do
    path="${record#*$'\t'}"
    path="${path#*$'\t'}"
    if ! allowed_path "$path"; then
      refused="$refused  $path"$'\n'
    fi
  done < <(git apply --numstat -z "$patch_file")
  if [ -n "$refused" ]; then
    printf 'The patch touches paths outside apps/, packages/, tools/ and pnpm-lock.yaml (.github/ is never allowed):\n%s' "$refused" >&2
    return 1
  fi
}

function find_open_pr() {
  gh pr list --repo "$repo" --head "$branch" --base "$base_branch" --state open \
    --json number,isDraft,isCrossRepository \
    --jq 'map(select(.isCrossRepository | not)) | .[0] // empty | "\(.number) \(.isDraft)"'
}

function find_ref_sha() {
  gh api "repos/$repo/git/matching-refs/heads/$1" \
    --jq ".[] | select(.ref == \"refs/heads/$1\") | .object.sha"
}

function find_branch_sha() {
  find_ref_sha "$branch"
}

function is_text() {
  tr -d '\000' < "$1" | cmp -s - "$1" && iconv -f UTF-8 -t UTF-8 "$1" > /dev/null 2>&1
}

function create_blob() {
  local sha
  if is_text "$1"; then
    sha=$(jq -Rs '{content: ., encoding: "utf-8"}' "$1" | gh api "repos/$repo/git/blobs" --input - --jq '.sha')
  else
    sha=$(base64 < "$1" | tr -d '\n' | jq -Rs '{content: ., encoding: "base64"}' |
      gh api "repos/$repo/git/blobs" --input - --jq '.sha')
  fi
  if [ "$sha" != "$(git hash-object "$1")" ]; then
    echo "Blob created for $1 does not match the local file" >&2
    return 1
  fi
  echo "$sha"
}

function file_mode() {
  if [ -x "$1" ]; then
    echo 100755
  else
    echo 100644
  fi
}

function create_commit() {
  local base_tree entries index path blob mode tree
  base_tree=$(gh api "repos/$repo/git/commits/$parent_sha" --jq '.tree.sha')
  entries='[]'
  index=0
  while [ "$index" -lt "${#change_paths[@]}" ]; do
    path="${change_paths[$index]}"
    if [ "${change_present[$index]}" = 1 ]; then
      blob=$(create_blob "$path")
      mode=$(file_mode "$path")
      entries=$(jq -c --arg path "$path" --arg mode "$mode" --arg sha "$blob" \
        '. + [{path: $path, mode: $mode, type: "blob", sha: $sha}]' <<< "$entries")
    else
      mode=$(git ls-tree HEAD -- "$path" | awk '{print $1}')
      entries=$(jq -c --arg path "$path" --arg mode "$mode" \
        '. + [{path: $path, mode: $mode, type: "blob", sha: null}]' <<< "$entries")
    fi
    index=$((index + 1))
  done
  tree=$(jq -n --arg base "$base_tree" --argjson entries "$entries" '{base_tree: $base, tree: $entries}' |
    gh api "repos/$repo/git/trees" --input - --jq '.sha')
  jq -n --arg message "$subject" --arg tree "$tree" --arg parent "$parent_sha" \
    '{message: $message, tree: $tree, parents: [$parent]}' |
    gh api "repos/$repo/git/commits" --input - --jq '.sha'
}

function is_screenshot() {
  [ -f "$1" ] && [ ! -L "$1" ] &&
    [ "$(wc -c < "$1" | tr -d ' ')" -le "$max_screenshot_bytes" ] &&
    [ "$(head -c 8 "$1" | od -An -tx1 | tr -d ' \n')" = "$png_signature" ]
}

function screenshot_cell() {
  if [ -n "$2" ]; then
    echo "![$1]($2)"
  else
    echo "—"
  fi
}

function publish_screenshots() {
  local line id caption side file blob folder count=0 entries='[]' head tree commit url
  local rows=()
  folder="$issue/${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
  while IFS= read -r line; do
    line="${line#- }"
    id="${line%%:*}"
    caption="${line#*:}"
    caption="${caption#"${caption%%[![:space:]]*}"}"
    caption="${caption//|/\\|}"
    if ! [[ "$id" =~ $screenshot_id_pattern ]]; then
      echo "open-pull-request: skipping screenshot '$id': not a lowercase hyphenated name" >&2
      continue
    fi
    count=$((count + 1))
    if [ "$count" -gt "$max_screenshots" ]; then
      echo "open-pull-request: skipping screenshots beyond $max_screenshots" >&2
      break
    fi
    local present=""
    for side in before after; do
      file="$screenshots_dir/$side/$id.png"
      if is_screenshot "$file"; then
        blob=$(create_blob "$file")
        entries=$(jq -c --arg path "$folder/$side/$id.png" --arg sha "$blob" \
          '. + [{path: $path, mode: "100644", type: "blob", sha: $sha}]' <<< "$entries")
        present="$present $side"
      elif [ -e "$file" ]; then
        echo "open-pull-request: skipping $side/$id.png: not a PNG under $max_screenshot_bytes bytes" >&2
      fi
    done
    rows+=("$id|${caption:-$id}|$present")
  done < <(status_bullets "$status_file" SCREENSHOTS)
  [ "$(jq 'length' <<< "$entries")" -gt 0 ] || return 0

  head=$(find_ref_sha "$screenshots_branch")
  if [ -n "$head" ]; then
    tree=$(jq -n --arg base "$(gh api "repos/$repo/git/commits/$head" --jq '.tree.sha')" \
      --argjson entries "$entries" '{base_tree: $base, tree: $entries}' |
      gh api "repos/$repo/git/trees" --input - --jq '.sha')
    commit=$(jq -n --arg message "Screenshots for #$issue" --arg tree "$tree" --arg parent "$head" \
      '{message: $message, tree: $tree, parents: [$parent]}' |
      gh api "repos/$repo/git/commits" --input - --jq '.sha')
    gh api -X PATCH "repos/$repo/git/refs/heads/$screenshots_branch" -f "sha=$commit" --silent
  else
    tree=$(jq -n --argjson entries "$entries" '{tree: $entries}' |
      gh api "repos/$repo/git/trees" --input - --jq '.sha')
    commit=$(jq -n --arg message "Screenshots for #$issue" --arg tree "$tree" \
      '{message: $message, tree: $tree, parents: []}' |
      gh api "repos/$repo/git/commits" --input - --jq '.sha')
    gh api "repos/$repo/git/refs" -f "ref=refs/heads/$screenshots_branch" -f "sha=$commit" --silent
  fi

  url="https://raw.githubusercontent.com/$repo/$commit/$folder"
  screenshot_table=$'| State | Before | After |\n| --- | --- | --- |'
  local row before_url after_url
  for row in "${rows[@]}"; do
    id="${row%%|*}"
    row="${row#*|}"
    caption="${row%|*}"
    present="${row##*|}"
    before_url=""
    after_url=""
    [[ "$present" == *before* ]] && before_url="$url/before/$id.png"
    [[ "$present" == *after* ]] && after_url="$url/after/$id.png"
    screenshot_table="$screenshot_table"$'\n'"| $caption | $(screenshot_cell "Before: $id" "$before_url") | $(screenshot_cell "After: $id" "$after_url") |"
  done
}

function write_section() {
  local bullets
  bullets=$(status_bullets "$status_file" "$1")
  if [ -n "$bullets" ]; then
    printf '\n## %s\n\n%s\n' "$2" "$bullets"
  fi
}

function write_body() {
  local keyword number
  keyword=Closes
  if [ "$state" = blocked ]; then
    keyword=Refs
  fi
  {
    for number in $numbers; do
      echo "$keyword #$number"
    done
    if [ "$state" = blocked ]; then
      write_section QUESTIONS Blocked
    fi
    write_section WHY Why
    write_section HOW How
    write_section TESTED Tested
    if [ -n "$screenshot_table" ]; then
      printf '\n## Screenshots\n\n%s\n' "$screenshot_table"
    fi
  } > "$body"
}

function comment_questions() {
  local run_url=""
  if [ -n "${GITHUB_RUN_ID:-}" ]; then
    run_url=" (${GITHUB_SERVER_URL:-https://github.com}/$repo/actions/runs/$GITHUB_RUN_ID)"
  fi
  {
    echo "The \`repo:fix-issues\` run$run_url stopped before changing anything. It needs answers to:"
    echo
    status_bullets "$status_file" QUESTIONS
  } > "$body"
  gh issue comment "$issue" --repo "$repo" --body-file "$body"
}

mkdir -p "$work_dir"
[ "$(git rev-parse HEAD)" = "$parent_sha" ] || fail "HEAD is not $parent_sha"

if [ -n "$patch_file" ] && [ -s "$patch_file" ]; then
  check_patch_paths || fail "refusing to apply $patch_file"
  git apply --binary "$patch_file"
fi

problems=$(status_problems "$status_file")
if [ -n "$problems" ]; then
  echo "$problems" | sed 's/^/  /' >&2
  fail "$status_file is not a valid fixer status"
fi
state=$(status_value "$status_file" STATE)
subject=$(status_value "$status_file" COMMIT)
numbers=$(closes_numbers "$status_file" "$issue")

collect_changes
report_refused_paths || fail "refusing to commit"
for path in ${change_paths[@]+"${change_paths[@]}"}; do
  if [ -L "$path" ]; then
    fail "refusing to commit the symbolic link $path"
  fi
done

if [ "${#change_paths[@]}" -eq 0 ]; then
  [ "$state" = blocked ] || fail "STATE is done but nothing changed"
  comment_questions
  exit 0
fi

pr=$(find_open_pr)
branch_sha=$(find_branch_sha)
publish_screenshots
write_body

commit_sha=$(create_commit)
if [ -z "$branch_sha" ]; then
  gh api "repos/$repo/git/refs" -f "ref=refs/heads/$branch" -f "sha=$commit_sha" --silent
else
  gh api -X PATCH "repos/$repo/git/refs/heads/$branch" -f "sha=$commit_sha" -F force=true --silent
fi

if [ -z "$pr" ]; then
  draft=()
  if [ "$state" = blocked ]; then
    draft=(--draft)
  fi
  gh pr create --repo "$repo" --head "$branch" --base "$base_branch" --title "$subject" \
    --body-file "$body" ${draft[@]+"${draft[@]}"}
  exit 0
fi

number="${pr%% *}"
is_draft="${pr##* }"
gh pr edit "$number" --repo "$repo" --title "$subject" --body-file "$body"
if [ "$state" = done ] && [ "$is_draft" = true ]; then
  gh pr ready "$number" --repo "$repo"
elif [ "$state" = blocked ] && [ "$is_draft" = false ]; then
  gh pr ready "$number" --repo "$repo" --undo
fi
gh pr view "$number" --repo "$repo" --json url --jq '.url'
