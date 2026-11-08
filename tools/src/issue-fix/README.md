# issue-fix

The steps of the `repo:issue-fix` workflow, run as `pnpm lt issue-fix <step>`. The workflow
(`.github/workflows/repo:issue-fix.yml`) and its round action (`.github/actions/issue-fix-round`)
only call these commands and Claude; everything they decide lives here.

## Flow

```
dispatch (issue, brief)
  │
  ▼  job issue-fix: read-only token, runs the fixer's code
fetch-issue ─▶ round 1 ─▶ round 2? ─▶ round 3? ─▶ round finish ─▶ strip-forbidden
  ─▶ screenshots capture ─▶ patch
                 │
                 └─ fix (Claude) ─▶ round begin ─▶ round verify ─▶ round snapshot
                                     ─▶ review (Claude) ─▶ round check-review ─▶ round end
  │
  ▼  job open-pull-request: write token, runs only dev's code
open-pull-request ─▶ signed commit on bot/issue-fix-<n>, co-authored by the dispatcher
  ─▶ pull request (or a comment with questions)
```

A round ends `clean` (next: finish), `failed` (next round, up to three) or `blocked` (finish).
After the last round `round finish` adds one entry per round to `tested`, and turns a run that
still fails into `blocked` with a question, so it becomes a draft pull request. `strip-forbidden`
then removes any change outside the allowed paths and, if it removed one, blocks the status with a
question naming each path and flagging the run as suspect, so the patch only ever holds allowed
paths and the result is a draft pull request instead of a refused one.

## Files in `tmp/issue-fix/`

| File                                  | Written by                | Read by                                                  |
| ------------------------------------- | ------------------------- | -------------------------------------------------------- |
| `issue.md`                            | `fetch-issue`             | fixer, reviewer                                          |
| `notes.md`                            | workflow (the brief)      | fixer, reviewer                                          |
| `status.json`                         | fixer                     | every step; schema in `status.ts`                        |
| `verify.md`                           | `round verify` on failure | `round end`, next fixer                                  |
| `review.json`                         | reviewer                  | `round check-review`, `round end`; schema in `review.ts` |
| `rounds/<n>/`, `run.json`             | `round end`               | next fixer and reviewer, `round finish`                  |
| `screenshot-specs/*.spec.ts`          | fixer                     | `screenshots capture`                                    |
| `screenshots/{before,after}/<id>.png` | `screenshots capture`     | `open-pull-request`                                      |
| `fix.patch`                           | workflow (`git diff`)     | `open-pull-request`                                      |

## Modules

| Module            | Responsibility                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| `status.ts`       | the fixer status schema and its rules (subject, required entries, screenshots) |
| `review.ts`       | the review schema                                                              |
| `git.ts`          | changed paths, allowed paths, tree snapshots, blob hashes                      |
| `verify.ts`       | the verification gate                                                          |
| `strip.ts`        | removing changes outside the allowed paths, with a blocking question           |
| `rounds.ts`       | round begin, verify, review check, end and finish                              |
| `screenshots.ts`  | capture before and after, PNG checks                                           |
| `issue.ts`        | fetch and render the issue                                                     |
| `pull-request.ts` | patch in a separate worktree, signed commit, screenshots, pull request body    |
| `github.ts`       | the GitHub REST and GraphQL client                                             |

Specs sit next to each module and use `test-repo.ts` (a throwaway git repository) and
`fake-github.ts` (a recording GitHub client) instead of real tools.

## Trust

The `issue-fix` job runs code the fixer can change, so its checks are a quality gate, not a
boundary. `open-pull-request` is the boundary: a fresh runner that builds `tools` from `dev`
before reading the artifact, applies the patch in a separate worktree, refuses anything outside
`apps/`, `packages/`, `tools/` and `pnpm-lock.yaml`, and holds the only write token.
