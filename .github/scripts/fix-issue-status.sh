#!/bin/bash

subject_pattern='^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)\([a-z0-9][a-z0-9-]*\)!?: [^[:space:]]'
max_subject_length=100

function status_value() {
  awk -v key="$2" 'index($0, key ":") == 1 { sub("^" key ":[ \t]*", ""); print; exit }' "$1"
}

function status_bullets() {
  awk -v key="$2" '
    /^[A-Z][A-Z-]*:/ { inside = (index($0, key ":") == 1); next }
    inside && /^[ \t]*- / { sub(/^[ \t]*/, ""); print }
  ' "$1"
}

function subject_problem() {
  local subject="$1"
  if [ -z "$subject" ]; then
    echo "COMMIT: is empty"
  elif ! [[ "$subject" =~ $subject_pattern ]]; then
    echo "COMMIT: '$subject' is not a conventional subject with a scope, like fix(extension): keep the fee row visible"
  elif [[ "$subject" =~ \#[0-9] ]]; then
    echo "COMMIT: '$subject' names an issue number; the pull request body closes the issue"
  elif [ "${#subject}" -gt "$max_subject_length" ]; then
    echo "COMMIT: '$subject' is longer than $max_subject_length characters"
  fi
}

function status_problems() {
  local file="$1"
  local state key
  if [ ! -f "$file" ]; then
    echo "$file does not exist"
    return 0
  fi
  state=$(status_value "$file" STATE)
  case "$state" in
    done)
      for key in WHY HOW TESTED; do
        if [ -z "$(status_bullets "$file" "$key")" ]; then
          echo "$key: has no bullets"
        fi
      done
      ;;
    blocked)
      if [ -z "$(status_bullets "$file" QUESTIONS)" ]; then
        echo "QUESTIONS: has no bullets"
      fi
      ;;
    *) echo "STATE: '$state' is neither done nor blocked" ;;
  esac
  subject_problem "$(status_value "$file" COMMIT)"
}

function closes_numbers() {
  local file="$1"
  local issue="$2"
  {
    echo "$issue"
    { status_value "$file" CLOSES; status_bullets "$file" CLOSES; } | grep -oE '[0-9]+' || true
  } | awk '!seen[$0]++'
}

function allowed_path() {
  case "$1" in
    apps/* | packages/* | tools/* | pnpm-lock.yaml) return 0 ;;
    *) return 1 ;;
  esac
}

function collect_changes() {
  local entry path
  change_paths=()
  change_present=()
  while IFS= read -r -d '' entry; do
    path="${entry:3}"
    if [ -e "$path" ] || [ -L "$path" ]; then
      change_paths+=("$path")
      change_present+=(1)
    elif git cat-file -e "HEAD:$path" 2>/dev/null; then
      change_paths+=("$path")
      change_present+=(0)
    fi
  done < <(git status --porcelain=v1 -z --untracked-files=all --no-renames)
}

function refused_paths() {
  local path
  for path in ${change_paths[@]+"${change_paths[@]}"}; do
    if ! allowed_path "$path"; then
      echo "$path"
    fi
  done
}

function report_refused_paths() {
  local refused
  refused=$(refused_paths)
  if [ -n "$refused" ]; then
    echo "These paths are outside apps/, packages/, tools/ and pnpm-lock.yaml (.github/ is never allowed):" >&2
    echo "$refused" | sed 's/^/  /' >&2
    return 1
  fi
}
