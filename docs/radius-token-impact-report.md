# Border radius tokens — current state (MojaUI)

Reference for `packages/tokens/src/radius.json` and how **mojaui-core** consumes it.

## Canonical scale (px)

| Token | Value |
|-------|------:|
| `none` | 0 |
| `xs` | 4 |
| `sm` | 6 |
| `md` | 8 |
| `lg` | 12 |
| `xl` | 16 |
| `2xl` | 24 |
| `3xl` | 32 |
| `4xl` | 40 |
| `full` | 9999 |

There is **no** `radius.input` in JSON. Form controls use **`RADIUS.md`** (8px) in component code.

## Codegen

- **Source:** `packages/mojaui-core/scripts/generate-from-tokens.mjs` reads `radius.json` and emits `RADIUS_SCALE` / `export const RADIUS = RADIUS_SCALE as const` (no synthetic `input` key).
- **Tamagui:** `mojauiTokens.radius` spreads `RADIUS` with `true` aliased to `RADIUS.md`.

## Theme usage (mojaui-core)

- **POPOVER** (`theme/constants.ts`): container border radius **`RADIUS.lg`** (12px).
- **Inputs / selects / code block field styling:** **`RADIUS.md`** (InputText, TextArea, Select, SelectCustom, InputGroup, CodeBlock).

## Storybook

- **Border radius docs:** `apps/showcase/src/stories/Foundations/ShapeBorders/BorderRadiusContent.tsx` — scale table and examples should stay aligned with the values above when tokens change.

## Maintenance

After editing `radius.json`:

1. `pnpm --filter @ojanti/mojaui-tokens run validate` (or `node scripts/validate-tokens.mjs` from `packages/tokens`).
2. `pnpm --filter @ojanti/mojaui-core run codegen`.
3. Update Storybook radius content if copy or demo pixels drift.
4. Subtree / publish **mojaui-tokens** when syncing the canonical package.

---

*Tumly (`tumly-new`) and Figma / token-sync-plugin are not driven by this file unless you align them separately.*
