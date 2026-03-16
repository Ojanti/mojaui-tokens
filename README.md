# @ojanti/mojaui-tokens

Canonical design tokens for MojaUI in W3C DTCG format.

## Package Structure

```
packages/tokens/
├── src/           # Canonical DTCG JSON (source of truth)
│   ├── colors/
│   │   ├── palette.json
│   │   └── theme.json
│   ├── spacing.json
│   ├── radius.json
│   └── zIndex.json
├── scripts/
│   ├── extract-tokens-to-dtcg.mjs
│   ├── validate-tokens.mjs
│   └── generate-tamagui.mjs
└── dist/          # Future multi-platform outputs (scaffolding)
```

## Scripts

- `pnpm run build` — Validate, then generate Tamagui files.
- `pnpm run validate` — Validate token files only.
- `pnpm run codegen` — Generate Tamagui files only (skips validation).
- `pnpm run extract` — One-time extract from Tamagui source to DTCG JSON.

## Canonical Source Policy

- `packages/tokens/src/**/*.json` is the **canonical persisted source of truth**.
- Generated Tamagui files in `packages/mojaui-core/src/theme/generated/` are derived from canonical JSON.

## Local Edit Warning Policy

- Direct edits to generated Tamagui files are allowed for local experimentation.
- Such edits are **non-canonical** and may be overwritten on next codegen.
- To persist changes: edit canonical JSON and run `pnpm run build`.
