---
name: issue-fix
description: Take one or more GitHub issue numbers for leather-io/mono, research each one, settle the open decisions with the person in one short round per issue, write a handoff brief per issue (or per group of overlapping issues), then dispatch the repo:issue-fix GitHub workflow once per brief, which runs the fixer, verifies it and opens a signed pull request from bot/issue-fix-<issue>-<run id>, and track the runs and pull requests to the end. Use when given one or more GitHub issue numbers to fix, asked to work through a batch of issues, or asked to dispatch fixers for issues.
---

# Issue fix

Hand this skill N issue numbers and get N pull requests back. The person's attention is the
expensive part, so research comes first (the questions are sharp and few), every agreement is
written down as a brief (the handoff to the fixer is lossless and survives context loss) and
overlapping fixes are grouped before anything is dispatched. That is the local half. The fixing
happens on GitHub: `scripts/dispatch.sh` runs the `repo:issue-fix` workflow once per brief, the
workflow's fixer implements it, the workflow re-runs the verification and commits the result
through the git data API, so the commit is signed by GitHub and the pull request comes from
`github-actions[bot]`. Nothing is committed or pushed from this machine.

Sections 1–5 need `gh`; from section 6 on the scripts need `gh` and `jq` only. Each script takes
`--help` and `--dry-run`.

## 1. Intake

Per issue:

```bash
gh issue view <n> --repo leather-io/mono --json number,title,body,labels,url,comments
```

From the body take the platform (the title prefix or the `platform:*` label: extension, mobile,
web, packages) and, when present, `### Decisions`, `### Verify`, `### Done when` and
`### Out of scope`. An issue drafted with the `new-issue` skill has them: `Settled:` lines are
binding, `Open:` lines must be asked before code is written. Read the comments too; they can carry
later decisions. An issue without those sections gets the same information from research.

Record the base with `git rev-parse origin/dev` for research. Never `git fetch`: a fetch can block
on a hardware key. Say which SHA you recorded and, if the tip looks stale, let the person refresh
it. The workflow itself always runs on the tip of `dev` at dispatch time.

Create the run directory and keep everything the skill and the scripts write there:

```bash
run_dir="${XDG_STATE_HOME:-$HOME/.local/state}/issue-fix/$(date +%Y%m%d-%H%M)"
mkdir -p "$run_dir/briefs"
printf '[]\n' > "$run_dir/run.json"
```

Never in a temp dir: a reboot wipes it. `run.json` is the manifest: a JSON array with one object
per dispatched brief, appended by `dispatch.sh`.

## 2. Research, one subagent per issue

Generate the extension feature map once, in the orchestrating checkout, before fanning out:
`pnpm lt feature-map generate --app extension` (see the `feature-map` skill).

Then one research subagent per issue, read-only, at most five at a time. Pass `model: "opus"`
explicitly on every one: subagents inherit the session model, and parallel subagents on a Fable
session hit the Fable rate limit. Give each the issue in full (body and comments), the base SHA,
the pointer to `.claude/skills/feature-map/SKILL.md` and the generated `extension.md`, any
`### Decisions` already on the issue with the rule that a `Settled` line is never re-asked, and ask
for exactly this shape back:

- **Cause** marked `proven` (a failing test or an observed path in this session) or `suspect`
  (anything only read). Proven requires running something; reading is suspect.
- **Touches**: repo-relative file paths the fix would change or add, one per line, best estimate.
- **Approaches**: one to three, each with the layer that owns it and one line of trade-off, the
  recommended one first.
- **Open decisions**: at most four, each with two to four options and a recommendation, only for
  choices that neither the code, `CLAUDE.md` nor the issue already settles. Zero is a fine answer.
- **Verify**: `Unit` command and the spec to extend or add; `E2E` command and the covering spec
  from the feature-map entry, or "none covers this"; `Fixtures` to reuse; `Needs` (device,
  Speculos, funded account, flag) or nothing.
- **Done when**: one to three boxes, behavior not implementation, reusing the issue's own when it
  has them.

## 3. Interview, one round per issue

Per issue, show the person in a few lines: the cause with its marker, the recommended approach,
the Touches and the Verify lines. Then exactly one `AskUserQuestion` round with the open decisions
(at most four, recommendation first) when there are any. An issue with none is shown as a plan to
confirm or redirect.

Every answer becomes `Settled: <choice> — <reason>`. Anything skipped stays `Open` and makes the
issue ineligible for dispatch until it is answered; say so. Never a second round for the same
issue.

## 4. Briefs

Write `$run_dir/briefs/<branch>.md` per issue from `references/brief.md` (the branch has a slash,
so the brief sits in `briefs/bot/`). The brief is the complete decision record the fixer gets and
must stand alone: the fixer never sees this conversation, and it is pasted verbatim as the
workflow's `notes` input, so it stays under the cap in `references/brief.md`.

| Field          | Shape                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch         | `bot/issue-fix-<n>-<run id>`, set by the workflow from the dispatched issue and its run                                                              |
| Grouped branch | `bot/issue-fix-<first issue>-<run id>` (section 5)                                                                                                   |
| Commit type    | follows the issue: a bug is `fix`, a change is `feat` or `refactor` by its nature (as in `CLAUDE.md`: `feat(mobile)`, `refactor(web)`, `fix(utils)`) |
| Commit scope   | the platform or package: `extension`, `mobile`, `web`, `<package>`                                                                                   |

The subject carries no issue number: the PR adds `(#n)` on merge, and the workflow writes
`Closes #n` into the PR body. The workflow refuses a subject without a scope or with an issue
number.

## 5. Overlap check

Intersect the Touches lists across briefs.

| Overlap                       | Action                                                    |
| ----------------------------- | --------------------------------------------------------- |
| Any shared file               | One dispatch for the group, one brief listing every issue |
| Same package, different files | Advisory: report it, keep separate dispatches             |
| Nothing shared                | One dispatch per issue                                    |

A group dispatches once, with its first issue as `issue` and the brief listing every issue in
order. The fixer works them in one run, ends with one commit, and its `CLOSES:` line carries every
number, so the one pull request closes them all. Show the grouping and wait for the person to
confirm it before anything is dispatched.

## 6. Dispatch

Dispatching is a GitHub write: show the list (issue, brief path, size) and get one explicit yes for
the batch first. Then per brief:

```bash
.claude/skills/issue-fix/scripts/dispatch.sh --run-dir "$run_dir" --issue 123
```

It reads `$run_dir/briefs/bot/issue-fix-123.md` (`--brief` and `--branch` override the defaults), refuses
a brief over 60,000 bytes, and pipes `{"issue": "123", "notes": <brief>}` to
`gh workflow run 'repo:issue-fix.yml' --repo leather-io/mono --ref dev --json` on standard input,
so the brief never lands on a command line. It then finds the run, from the URL `gh` prints or by
polling `gh run list --workflow 'repo:issue-fix.yml'` for the `issue-fix: #123` title created
after the dispatch, and records `run_id`, `run_url` and `dispatched_at` in `run.json`. Re-running it
for the same issue dispatches again and replaces the entry's run (section 8).

When the dispatch is refused (no write access to `leather-io/mono`, or the workflow is not on
`dev`), the script prints the brief path and the manual command for someone who has access, and
exits 3:

```bash
jq -n --arg issue 123 --rawfile notes <brief> '{issue: $issue, notes: $notes}' |
  gh workflow run 'repo:issue-fix.yml' --repo leather-io/mono --ref dev --json
```

**What the run does.** Job `issue-fix` (read-only token) checks out `dev`, builds the packages,
renders the issue and its comments to `tmp/issue-fix/issue.md`, writes the brief to
`tmp/issue-fix/notes.md`, writes `apps/extension/.env` from the `PUBLIC_*` repository variables,
installs Chromium for Playwright (the browser cache is restored, never saved) and runs the fixer
with `.github/prompts/issue-fix.md`. The fixer can build the extension in test mode and run its
end-to-end specs under `xvfb-run` with the `EXTENSION_INTEGRATION_TEST_MNEMONIC` test wallet, and
read issues, pull requests and code through the read-only GitHub MCP server.

The fix runs in up to three rounds of the composite action `.github/actions/issue-fix-round`, each
fix → verify → review:

- **Fix.** Round 1 follows `.github/prompts/issue-fix.md`; later rounds follow
  `.github/prompts/issue-fix-round.md` and fix only what the previous round reported.
- **Verify.** `pnpm lt issue-fix round verify`: the status in `status.json` must be valid, every
  change must be under the allowed paths, `pnpm format` must change nothing, then lint, typecheck,
  knip, the extension's unused exports and the unit tests of every changed package and its
  dependents. A failure is written to `verify.md` with the tail of the failing output and sends the
  change back to fix; the review is skipped.
- **Review.** A separate Claude pass with `.github/prompts/issue-fix-review.md` writes `review.json`:
  confirmed `critical`, `blocker` and `regression` findings under `blocking`, anything smaller under
  `minor`. Later rounds see earlier reviews and only re-raise unfixed or newly introduced findings.
  The run fails if the review touched any file. Blocking findings send the change back to fix; minor
  ones are left for the human review.

Each round is kept in `tmp/issue-fix/rounds/<n>/` and recorded in `tmp/issue-fix/run.json` (both
uploaded with the patch); `pnpm lt issue-fix round finish` adds one `Round <n>: …` entry per round
to `tested`. A round that is clean ends the loop; a fixer that sets `"state": "blocked"` ends it
too. If round 3 still fails, the status becomes `blocked` with a question naming what still fails,
so the result is a draft pull request. Then
`pnpm lt issue-fix strip-forbidden` removes every change outside the allowed paths (restoring
tracked files, deleting new ones) and, when it removed any, sets the status to `blocked` with a
question that names the paths and says to treat the run as suspect unless the issue asked for them.
The patch therefore only ever holds allowed paths, and a fixer that touched `.github/` produces a
draft pull request with that question instead of a refused, empty run.

For a change that alters what an extension screen shows, the fixer writes throwaway Playwright
specs in `tmp/issue-fix/screenshot-specs/` that save one PNG per state, and lists the states under
`screenshots` in the status. `pnpm lt issue-fix screenshots capture` builds the test extension and
runs them on the fix, stashes the fix, builds and runs them on `dev`, then restores the fix and
fails the run if it did not come back intact. A failed build or spec only leaves that cell empty.
`open-pull-request` checks each image (a real PNG, at most 1 MB, a lowercase hyphenated name, 12 at
most), commits them to the `bot/screenshots` branch under `<issue>/<run>-<attempt>/`, and adds a
`## Screenshots` table with one row per state and `Before` and `After` images linked by commit.

Job `open-pull-request` builds `tools` from `dev`, gets only the patch and the status file, applies
the patch in a separate git worktree, refuses any path outside `apps/`, `packages/`, `tools/` and
`pnpm-lock.yaml`, and writes the signed commit to a new `bot/issue-fix-<n>-<run id>` (`pnpm lt issue-fix
open-pull-request`). The commit carries a `Co-authored-by:` trailer for the person who dispatched
the run (`github.triggering_actor`, with their public name and GitHub no-reply email; bots are
skipped), which GitHub keeps in the squash-merge message. `done`
opens a pull request; `blocked` with changes opens a draft whose body lists the questions;
`blocked` with no changes comments the questions on the issue.

**Trust.** The fixer runs with `--permission-mode auto --permission-prompts none`: Claude Code's
classifier reviews each tool call and refuses the ones that reach beyond the fix, and anything
that would wait for a person is denied. `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` must stay unset: it
forces the default permission mode, which turns auto mode off. `pnpm` scripts are arbitrary code
the fixer can edit, so an allowlist would not be a boundary either. What it can reach is: its job
holds the OAuth token for Claude (the action needs it) and a read-only GitHub token, and its shell
inherits both. The write token exists only in the second job, on a fresh runner that runs no code
from the patch. The verify step is a quality gate, not a security boundary.
Every GitHub write in `open-pull-request` uses an installation token of the `issue-fix` GitHub App
(`actions/create-github-app-token`), not the run's `GITHUB_TOKEN`. GitHub starts no workflows for
events made with `GITHUB_TOKEN`; the App's push and pull request start CI like any contributor's,
and its API commits are signed. The pull request then needs two human reviews like any other.

**App setup, once per repository:** create a GitHub App (webhook off; repository permissions
Contents, Pull requests and Issues read and write, Metadata read; no Workflows permission) and
install it on the repository only. Create the environment `issue-fix`, limited to the `dev`
branch, with the variable `ISSUE_FIX_APP_CLIENT_ID` (the App's client ID) and the secret
`ISSUE_FIX_APP_PRIVATE_KEY` (a private key generated for the App). Without them the `app-token`
step fails and no pull request opens; the patch stays in the run's artifact for three days.

## 7. Track

```bash
.claude/skills/issue-fix/scripts/status.sh --run-dir "$run_dir"
.claude/skills/issue-fix/scripts/status.sh --run-dir "$run_dir" --watch
```

One row per entry: the run's status and conclusion and its URL (`gh run view`), and the pull
request on the run's `bot/issue-fix-<n>-<run id>` (`gh pr list --state all`) with its number, draft state and URL. For a
draft it prints the `## Blocked` questions from the body below the table. `--watch` repeats every
60 seconds (`--interval` changes it) until every run has completed. A run takes from 20 minutes to
two hours; run `--watch` in the background, never poll in a loop of your own.

## 8. Answer blocked runs

A blocked fixer asks its questions in a draft pull request (`status.sh` prints them) or, when it
changed nothing, in an issue comment. Put them to the person in one `AskUserQuestion` round per
issue: these are the fixer's questions, a new set, not a second interview. Append each answer to the
brief's Decisions as `Settled: <choice> — <reason>`, then dispatch again with `dispatch.sh`, after
the same explicit yes. Every run gets its own branch, `bot/issue-fix-<n>-<run id>`, and its own pull
request; once it is open the run comments `Superseded by #<new>` on the issue's earlier bot pull
request, closes it and deletes its branch. No branch is ever moved or force-pushed, so a change to a
workflow on `dev` between runs never needs the App's Workflows permission, which it does not have.

## 9. Report

Per issue: the run URL and conclusion, the pull request URL and whether it is a draft, and what
still needs a human: the open questions of a blocked run, a failed run's failing step (from
`gh run view <id> --log-failed`), the `Not verified:` lines of the PR body, and the reviews every
pull request needs before merge. Then the run directory path, so a later session can resume from
`status.sh` alone.
