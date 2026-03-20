# @ojanti/mojaui-tokens

Design tokens for MojaUI in [W3C DTCG format](https://design-tokens.github.io/community-group/format/). Framework-agnostic source of truth for colors, typography, spacing, shadows, and more.

## What are design tokens?

Design tokens are named design decisions (colors, spacing, typography, shadows), stored in a platform-agnostic format. They enable consistent styling across web, mobile, and other platforms. This repository provides the canonical token definitions in the W3C Design Tokens Community Group (DTCG) format, which is widely supported by tools like Style Dictionary, Tokens Studio, and custom pipelines.

## Token categories

| File | Purpose |
|------|---------|
| `src/colors/palette.json` | Base color palette (raw hex/rgba values) |
| `src/colors/theme.json` | Semantic theme tokens (light/dark) referencing palette |
| `src/typography.json` | Font families (base, web stack, native), sizes (1-5 for headings, lg-xxs for body), line heights, letter spacing, paragraph spacing. Shared weight scale (400-800) at typography.weight. Platform-specific face mappings in $extensions. |
| `src/shadows.json` | Shadow definitions with web (box-shadow), iOS, and Android platform values |
| `src/spacing.json` | Space and size scales |
| `src/radius.json` | Border radius scale |
| `src/borderWidth.json` | Border width scale |
| `src/zIndex.json` | Z-index layers |

## Format

Tokens follow the W3C DTCG specification:

- **`$type`** - Token type (`color`, `dimension`, `number`, `shadow`, `fontFamily`, etc.)
- **`$value`** - The token value (string, number, or object depending on type)
- **`$extensions`** - Optional platform-specific overrides (e.g. `platform.ios`, `platform.android` for shadows; `platform.fontFace` for native font file mappings)

Example:

```json
{
  "palette": {
    "brandPrimary": {
      "$type": "color",
      "$value": "#6C5CE7"
    }
  }
}
```

## Font Family Tokens

Typography tokens define three font family properties per role (heading, body):

- **`fontFamily`** - Base family name (e.g., `"NunitoSans"`, `"Inter"`)  
  Use for documentation, design tools, and inter-app operability.
  
- **`fontFamilyWeb`** - Full CSS font stack with fallbacks  
  Use for web `font-family` CSS property.
  
- **`fontFamilyNative`** - React Native family name with weight suffix (e.g., `"NunitoSans-Regular"`)  
  Required for Tamagui's `createFont` on native platforms. The `-Regular` suffix provides the base/fallback variant; weight-specific files are mapped via `$extensions['platform.fontFace']`.

Example:
```json
{
  "typography": {
    "heading": {
      "fontFamily": { "$type": "fontFamily", "$value": "NunitoSans" },
      "fontFamilyWeb": { "$type": "fontFamily", "$value": "NunitoSans, Inter, system-ui, sans-serif" },
      "fontFamilyNative": { "$type": "fontFamily", "$value": "NunitoSans-Regular" }
    }
  }
}
```

## Additional Typography Tokens

### Font Weight Scale

The shared weight scale supports weights from 400 (Regular) to 800 (ExtraBold):

- **400** - Regular
- **500** - Medium ⭐ _Added for enhanced typography hierarchy_
- **600** - SemiBold  
- **700** - Bold
- **800** - ExtraBold

### Paragraph Spacing

Each typography role (heading, body) includes `paragraphSpacing` tokens for consistent text block spacing:

- **Heading**: Uses numeric scale (1-5, largest to smallest)
- **Body**: Uses size scale (lg, md, sm, xs, xxs)

Example paragraph spacing usage:
```json
"heading": {
  "paragraphSpacing": {
    "1": { "$type": "dimension", "$value": { "value": 32, "unit": "px" } },
    "2": { "$type": "dimension", "$value": { "value": 28, "unit": "px" } }
  }
}
```

## How to use

Clone this repository and use the JSON files with any design token tooling:

- **Style Dictionary** - Transform tokens to CSS variables, iOS/Android assets, etc.
- **Tokens Studio** - Sync with Figma or other design tools
- **Custom scripts** - Parse the JSON and generate outputs for your stack

The tokens are framework-agnostic. You can build pipelines for React, Vue, React Native, Flutter, or plain CSS.

## Validation

Validate all token files:

```bash
node scripts/validate-tokens.mjs
```

Or with pnpm:

```bash
pnpm run validate
```

Validation checks schema compliance, reference resolution (e.g. `{palette.brandPrimary}`), naming conventions, and value ranges.

## Structure

```
├── src/
│   ├── colors/
│   │   ├── palette.json
│   │   └── theme.json
│   ├── typography.json
│   ├── shadows.json
│   ├── spacing.json
│   ├── radius.json
│   ├── zIndex.json
│   └── borderWidth.json
├── scripts/
│   └── validate-tokens.mjs
├── package.json
├── LICENSE
└── README.md
```

## License

[CC BY 4.0](LICENSE) - Creative Commons Attribution 4.0 International. You may use, share, and adapt these tokens with attribution.

## MojaUI

These tokens power the MojaUI design system. MojaUI consumes them via a Tamagui-specific codegen pipeline; this repository contains only the canonical source, so you can build your own pipelines for any framework.
