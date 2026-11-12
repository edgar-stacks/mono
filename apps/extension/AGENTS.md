# Extension: building UI

Read the root `AGENTS.md` first; every rule in it applies here.

When you build or change UI in the extension, use the `leather-ui` skill. It starts at component lookup and recipes, then states, then checks.

- Find the `@leather.io/ui` component for a job in `docs/design/i-need-to.md` before composing your own.
- Prototype extension screens in the web Playground: the recipes in `apps/web/app/pages/playground/shared/recipes/` render at `/playground/recipes`, and `/playground/receive-example` shows a popup flow built from them at 390×600.
- Check a change with `pnpm design:check <path>` and fix every message; under `src/` it also flags local copies of shared components.
- Never import `radix-ui` or `@radix-ui/*` here; use the `@leather.io/ui` component that wraps it.
