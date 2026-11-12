# Web app: building UI

Read the root `AGENTS.md` first; every rule in it applies here.

When you build or change UI in this app, use the `leather-ui` skill. It starts at component lookup and recipes, then states, then checks.

- Find the `@leather.io/ui` component for a job in `docs/design/i-need-to.md` before composing your own.
- Copy compositions from the Playground recipes in `app/pages/playground/shared/recipes/`. They render together at `/playground/recipes`, and a full flow built from them at `/playground/receive-example`.
- Compare directions and review light, dark, narrow and long states with the exploration shell in `app/pages/playground/shared/exploration/`.
- Check a prototype with `pnpm design:check <path>` and fix every message; each one links its rule in `docs/design/never.md`.
- Recipes stay in the Playground until a composition is promoted. Never move a recipe into product code as part of a prototype.
