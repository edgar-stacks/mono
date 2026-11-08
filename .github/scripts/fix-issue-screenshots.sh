#!/bin/bash
set -euo pipefail

mode="${1:-}"
root="$(git rev-parse --show-toplevel)"
work_dir="$root/${WORK_DIR:-tmp/fix-issue}"
specs_dir="$work_dir/screenshot-specs"
shots_dir="$work_dir/screenshots"
config_file="$work_dir/playwright.screenshots.config.ts"
extension_dir="$root/apps/extension"
stash_message="fix-issue-screenshots"
stash_identity=(-c user.name=fix-issues -c user.email=fix-issues@users.noreply.github.com)

. "$(dirname "${BASH_SOURCE[0]}")/fix-issue-status.sh"

function has_specs() {
  compgen -G "$specs_dir/*.spec.ts" > /dev/null
}

function write_config() {
  cat > "$config_file" <<EOF
import { defineConfig } from '@playwright/test';

import baseConfig from '$extension_dir/playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '$specs_dir',
  globalSetup: '$extension_dir/tests/global-playwright-setup.js',
  tsconfig: '$extension_dir/tsconfig.json',
  outputDir: '$work_dir/screenshot-results',
  retries: 0,
  reporter: [['list']],
  webServer: { ...baseConfig.webServer, cwd: '$extension_dir' },
});
EOF
}

function build_extension() {
  (cd "$root" && pnpm turbo run build --filter='@leather.io/extension^...' &&
    pnpm --filter @leather.io/extension build:test)
}

function take_screenshots() {
  local label="$1"
  rm -rf "${shots_dir:?}/$label"
  mkdir -p "$shots_dir/$label"
  write_config
  if ! (cd "$extension_dir" && REVIEW_SCREENSHOT_DIR="$shots_dir/$label" \
    xvfb-run pnpm exec playwright test --config "$config_file"); then
    echo "fix-issue-screenshots: some $label screenshot specs failed; their states show as missing"
  fi
}

function stash_count() {
  git -C "$root" stash list | wc -l | tr -d ' '
}

case "$mode" in
  preview)
    has_specs || { echo "fix-issue-screenshots: no specs in $specs_dir" >&2; exit 1; }
    take_screenshots preview
    ls "$shots_dir/preview"
    ;;
  capture)
    if ! has_specs; then
      echo "fix-issue-screenshots: no screenshot specs; nothing to capture"
      exit 0
    fi
    cd "$root"
    before_snapshot=$(tree_snapshot)
    if build_extension; then
      take_screenshots after
    else
      echo "fix-issue-screenshots: the fixed tree did not build; skipping screenshots"
      exit 0
    fi
    stashes=$(stash_count)
    git "${stash_identity[@]}" stash push --include-untracked --quiet -m "$stash_message"
    stashed=false
    [ "$(stash_count)" -gt "$stashes" ] && stashed=true
    restore() {
      if [ "$stashed" = true ]; then
        git checkout --quiet -- .
        git clean -fdq
        git "${stash_identity[@]}" stash pop --index --quiet
        stashed=false
      fi
    }
    trap restore EXIT
    if build_extension; then
      take_screenshots before
    else
      echo "fix-issue-screenshots: dev did not build; before screenshots show as missing"
    fi
    restore
    trap - EXIT
    if [ "$(tree_snapshot)" != "$before_snapshot" ]; then
      git status --short >&2
      echo "fix-issue-screenshots: the fix did not come back intact after the before capture" >&2
      exit 1
    fi
    echo "fix-issue-screenshots: captured $(ls "$shots_dir/after" | wc -l | tr -d ' ') after and $(ls "$shots_dir/before" 2> /dev/null | wc -l | tr -d ' ') before screenshots"
    ;;
  *)
    echo "usage: fix-issue-screenshots.sh preview|capture" >&2
    exit 2
    ;;
esac
