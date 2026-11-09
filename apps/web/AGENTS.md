# Web app agent notes

These notes add to the root `AGENTS.md`; every rule there applies here.

## Building or changing UI

- Start from the `leather-ui` skill (`.claude/skills/leather-ui/SKILL.md`). Look up the component for the job first, then a recipe, then the states, then the checks.
- Compose from `@leather.io/ui`. Never import `radix-ui` or `@radix-ui/*` here; ask for the primitive in `packages/ui` instead.
- Use semantic colour tokens (`ink.*`, `red.*`, …) and the defined text styles. No raw colours, raw `<button>`s, text opacity or monospace amounts.

## Playground

- Prototypes live in `app/pages/playground/`. An area is a folder under `areas/` plus one entry in `playground-areas.ts`.
- Reviewed compositions live in `app/pages/playground/shared/recipes/`. Copy from them before composing a new screen; `/playground/recipes` shows each one in light and dark.
- `/playground/receive-example` is the reference screen: a fixture-only Receive flow built only from recipes.
- `app/pages/playground/shared/exploration/` holds the canvas, rails, frames, click-through and lightbox for comparing directions. Frames read `?theme=`, `?width=`, `?frame=` and `?step=` from the URL.
- Recipes stay in the Playground until a composition is promoted into `packages/ui` through a reviewed change.

## Checks

- `pnpm --filter @leather.io/web test:unit` runs the recipe specs under jsdom.
- Check a Playground page in light and dark, at 390×600 and in a long state, before asking for review.
