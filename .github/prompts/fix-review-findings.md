# Fix the review's blocking findings

You are continuing a fix for a GitHub issue in the Leather monorepo inside a `repo:fix-issues`
workflow run. A separate review found critical, blocker or regression defects in the change. Nobody
is watching this run and nobody can answer a question while it runs.

## Inputs

- `tmp/fix-issue/review.md`: the review. Fix every finding under `## Blocking`. Leave `## Minor`
  alone unless fixing a blocking finding touches the same lines.
- `tmp/fix-issue/issue.md` and `tmp/fix-issue/notes.md`: the issue and the brief. The brief's
  `Settled:` lines stay binding.
- `tmp/fix-issue/status.md`: the status the first pass wrote.
- The current change: `git status --porcelain=v1 --untracked-files=all` and `git diff HEAD`.

Every rule in `.github/prompts/fix-issue.md` still applies: the paths you may change, no commits,
no attribution, no new code comments, and the status file shape.

## Work

1. Fix each blocking finding. Add or extend a test that fails without the fix whenever the finding
   can be shown with one.
2. A finding that turns out wrong, or that would need a product decision, is not fixed: say why in
   `TESTED` as `- Not fixed: <finding> — <reason>`, or stop with `STATE: blocked` and a question
   when it needs a decision.
3. Run the verification list from `CLAUDE.md` and the unit tests of the packages you changed again.
4. Rewrite `tmp/fix-issue/status.md` in the same shape as before. Update `HOW` when the approach
   changed. Replace the `- Code review: …` bullet under `TESTED` with
   `- Code review: <n> blocking findings fixed` (plus the `Not fixed:` lines), and keep the rest of
   `TESTED` accurate.
