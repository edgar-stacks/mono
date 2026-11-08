---
name: fix-issues
description: Take one or more GitHub issue numbers for leather-io/mono, research each one, settle the open decisions with the person in one short round per issue, write a handoff brief per issue (or per group of overlapping issues), then dispatch the repo:fix-issues GitHub workflow once per brief, which runs the fixer, verifies it and opens a signed pull request from bot/fix-<issue>, and track the runs and pull requests to the end. Use when given one or more GitHub issue numbers to fix, asked to work through a batch of issues, or asked to dispatch fixers for issues.
---

# Fix issues

Hand this skill N issue numbers and get N pull requests back. The person's attention is the
expensive part, so research comes first (the questions are sharp and few), every agreement is
written down as a brief (the handoff to the fixer is lossless and survives context loss) and
overlapping fixes are grouped before anything is dispatched. That is the local half. The fixing
happens on GitHub: `scripts/dispatch.sh` runs the `repo:fix-issues` workflow once per brief, the
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
run_dir="${XDG_STATE_HOME:-$HOME/.local/state}/fix-issues/$(date +%Y%m%d-%H%M)"
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
| Branch         | `bot/fix-<n>`, set by the workflow from the dispatched issue                                                                                         |
| Grouped branch | `bot/fix-<first issue>` (section 5)                                                                                                                  |
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
.claude/skills/fix-issues/scripts/dispatch.sh --run-dir "$run_dir" --issue 123
```

It reads `$run_dir/briefs/bot/fix-123.md` (`--brief` and `--branch` override the defaults), refuses
a brief over 60,000 bytes, and pipes `{"issue": "123", "notes": <brief>}` to
`gh workflow run 'repo:fix-issues.yml' --repo leather-io/mono --ref dev --json` on standard input,
so the brief never lands on a command line. It then finds the run, from the URL `gh` prints or by
polling `gh run list --workflow 'repo:fix-issues.yml'` for the `fix-issues: #123` title created
after the dispatch, and records `run_id`, `run_url` and `dispatched_at` in `run.json`. Re-running it
for the same issue dispatches again and replaces the entry's run (section 8).

When the dispatch is refused (no write access to `leather-io/mono`, or the workflow is not on
`dev`), the script prints the brief path and the manual command for someone who has access, and
exits 3:

```bash
jq -n --arg issue 123 --rawfile notes <brief> '{issue: $issue, notes: $notes}' |
  gh workflow run 'repo:fix-issues.yml' --repo leather-io/mono --ref dev --json
```

**What the run does.** Job `fix-issue` (read-only token) checks out `dev`, builds the packages,
renders the issue and its comments to `tmp/fix-issue/issue.md`, writes the brief to
`tmp/fix-issue/notes.md` and runs the fixer with `.github/prompts/fix-issue.md`. Then it re-runs
the gate itself: `pnpm format` must change nothing, then lint, typecheck, knip, the extension's
unused exports and the unit tests of every changed package and its dependents. Job
`open-pull-request` gets only the patch and the status file, refuses any path outside `apps/`,
`packages/`, `tools/` and `pnpm-lock.yaml`, and writes the signed commit to `bot/fix-<n>`. `done`
opens a pull request; `blocked` with changes opens a draft whose body lists the questions;
`blocked` with no changes comments the questions on the issue.

**Trust.** The fixer runs `pnpm`, and `pnpm` scripts are arbitrary code it can edit, so the tool
list is not the boundary. What it can reach is: its job holds the OAuth token for Claude (the
action needs it) and a read-only GitHub token, and the action scrubs Actions secrets from the
fixer's subprocesses. The write token exists only in the second job, on a fresh runner that
runs no code from the patch. The verify step is a quality gate, not a security boundary.
GitHub starts no `push` or `pull_request` workflows for events made with the run's own
`GITHUB_TOKEN`, so CI and `repo:claude-code-review` do not start on their own: close and reopen
the pull request to trigger them. After that it needs two human reviews like any other.

## 7. Track

```bash
.claude/skills/fix-issues/scripts/status.sh --run-dir "$run_dir"
.claude/skills/fix-issues/scripts/status.sh --run-dir "$run_dir" --watch
```

One row per entry: the run's status and conclusion and its URL (`gh run view`), and the pull
request on `bot/fix-<n>` (`gh pr list --state all`) with its number, draft state and URL. For a
draft it prints the `## Blocked` questions from the body below the table. `--watch` repeats every
60 seconds (`--interval` changes it) until every run has completed. A run takes from 20 minutes to
two hours; run `--watch` in the background, never poll in a loop of your own.

## 8. Answer blocked runs

A blocked fixer asks its questions in a draft pull request (`status.sh` prints them) or, when it
changed nothing, in an issue comment. Put them to the person in one `AskUserQuestion` round per
issue: these are the fixer's questions, a new set, not a second interview. Append each answer to the
brief's Decisions as `Settled: <choice> — <reason>`, then dispatch again with `dispatch.sh`, after
the same explicit yes. The workflow force-updates `bot/fix-<n>`, rewrites the pull request body and
marks the draft ready once the new run is done.

## 9. Report

Per issue: the run URL and conclusion, the pull request URL and whether it is a draft, and what
still needs a human: the open questions of a blocked run, a failed run's failing step (from
`gh run view <id> --log-failed`), the `Not verified:` lines of the PR body, and the reviews every
pull request needs before merge. Then the run directory path, so a later session can resume from
`status.sh` alone.
