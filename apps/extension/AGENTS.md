# Extension agent notes

These notes add to the root `AGENTS.md`; every rule there applies here.

## Building or changing UI

- Start from the `leather-ui` skill (`.claude/skills/leather-ui/SKILL.md`). Look up the component for the job first, then a recipe, then the states, then the checks.
- Compose from `@leather.io/ui` before writing a local component; a local copy of a shared component drifts from the system.
- Never import `radix-ui` or `@radix-ui/*` here; ask for the primitive in `packages/ui` instead.
- Use semantic colour tokens (`ink.*`, `red.*`, …) and the defined text styles. No raw colours, raw `<button>`s, text opacity or monospace amounts.

## Prototyping

- Prototype extension screens in the web Playground (`apps/web/app/pages/playground/`), in the Extension section. Reuse the recipes in `apps/web/app/pages/playground/shared/recipes/` and copy `/playground/receive-example` as the reference screen.
- Nothing in the Playground moves into the extension without a reviewed change.

## Checks

- Every screen change is checked in light and dark, at the 390px popup width and in a long state.
- E2E conventions live in the `write-extension-e2e` skill.
