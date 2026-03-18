#!/usr/bin/env node
/**
 * Generate Tamagui theme files from canonical DTCG JSON.
 * Output: packages/mojaui-core/src/theme/generated/
 * Run: pnpm --filter @ojanti/mojaui-tokens run codegen
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BANNER = `/**
 * GENERATED - Do not edit. Edits may be overwritten on next codegen.
 * Source: packages/tokens/src/ (canonical DTCG JSON)
 * To persist changes, edit canonical JSON and run: pnpm --filter @ojanti/mojaui-tokens run build
 */
`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PKG = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(TOKENS_PKG, '../..')
const SRC = path.join(TOKENS_PKG, 'src')
const COLORS_SRC = path.join(SRC, 'colors')
const GENERATED = path.join(REPO_ROOT, 'packages/mojaui-core/src/theme/generated')

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

/** Extract numeric value in px from DTCG dimension { value, unit }. Supports px and rem (1rem=16px). */
function dimensionToPx(val) {
  if (typeof val !== 'object' || val === null || typeof val.value !== 'number') {
    throw new Error(`Invalid dimension: expected { value: number, unit: "px"|"rem" }`)
  }
  if (val.unit === 'rem') return Math.round(val.value * 16)
  if (val.unit === 'px') return val.value
  throw new Error(`Invalid dimension unit: "${val.unit}" (expected "px" or "rem")`)
}

function resolveRef(ref, palette) {
  const m = ref.match(/^\{palette\.(\w+)\}$/)
  if (!m) return ref
  const val = palette?.[m[1]]?.$value
  return val ?? ref
}

function main() {
  mkdirSync(GENERATED, { recursive: true })

  const paletteData = loadJson(path.join(COLORS_SRC, 'palette.json'))
  const themeData = loadJson(path.join(COLORS_SRC, 'theme.json'))
  const spacingData = loadJson(path.join(SRC, 'spacing.json'))
  const radiusData = loadJson(path.join(SRC, 'radius.json'))
  const zIndexData = loadJson(path.join(SRC, 'zIndex.json'))
  const borderWidthData = loadJson(path.join(SRC, 'borderWidth.json'))
  const typographyData = loadJson(path.join(SRC, 'typography.json'))
  const shadowData = loadJson(path.join(SRC, 'shadows.json'))

  const palette = paletteData.palette
  const colorTheme = themeData.colorTheme

  const quoteKey = (k) => /^\d|[-.]/.test(k) ? `'${k}'` : k
  const spaceEntries = Object.entries(spacingData.space || {}).map(([k, v]) => {
    const num = dimensionToPx(v.$value)
    return [`  ${quoteKey(k)}: ${num},`]
  }).flat()
  const sizeEntries = Object.entries(spacingData.size || {}).map(([k, v]) => {
    const num = dimensionToPx(v.$value)
    return [`  ${quoteKey(k)}: ${num},`]
  }).flat()

  const radiusEntries = Object.entries(radiusData.radius || {}).map(([k, v]) => {
    const num = dimensionToPx(v.$value)
    const qk = /^\d|[-.]/.test(k) ? `'${k}'` : k
    return [`  ${qk}: ${num},`]
  }).flat()

  const zIndexEntries = Object.entries(zIndexData.zIndex || {}).map(([k, v]) => {
    return [`  ${k}: ${v.$value},`]
  }).flat()

  const paletteObj = {}
  for (const [k, v] of Object.entries(palette)) {
    paletteObj[k] = v.$value
  }

  const lightTheme = {}
  for (const [k, v] of Object.entries(colorTheme.light)) {
    lightTheme[k] = resolveRef(v.$value, palette)
  }
  const darkTheme = {}
  for (const [k, v] of Object.entries(colorTheme.dark)) {
    darkTheme[k] = resolveRef(v.$value, palette)
  }

  const spaceObj = {}
  for (const [k, v] of Object.entries(spacingData.space || {})) {
    spaceObj[k] = dimensionToPx(v.$value)
  }
  const sizeObj = {}
  for (const [k, v] of Object.entries(spacingData.size || {})) {
    sizeObj[k] = dimensionToPx(v.$value)
  }
  const radiusObj = {}
  for (const [k, v] of Object.entries(radiusData.radius || {})) {
    radiusObj[k] = dimensionToPx(v.$value)
  }
  const zIndexObj = {}
  for (const [k, v] of Object.entries(zIndexData.zIndex || {})) {
    zIndexObj[k] = v.$value
  }

  const borderWidthObj = {}
  for (const [k, v] of Object.entries(borderWidthData.borderWidth || {})) {
    borderWidthObj[k] = dimensionToPx(v.$value)
  }

  const borderWidthEntries = Object.entries(borderWidthObj)
    .map(([k, v]) => `  ${k}: ${v},`)
    .join('\n')

  // Typography: build font defs for createFont
  const typo = typographyData?.typography || {}
  const buildFontDef = (role) => {
    const def = typo[role]
    if (!def) return null
    const quoteKey = (k) => /^\d|[-.]/.test(k) ? `'${k}'` : k
    const sizeObj = {}
    for (const [k, v] of Object.entries(def.size || {})) {
      sizeObj[k] = dimensionToPx(v.$value)
    }
    const lineHeightObj = {}
    for (const [k, v] of Object.entries(def.lineHeight || {})) {
      lineHeightObj[k] = dimensionToPx(v.$value)
    }
    const weightObj = {}
    for (const [k, v] of Object.entries(def.weight || {})) {
      weightObj[k] = String(v.$value)
    }
    const letterSpacingObj = {}
    for (const [k, v] of Object.entries(def.letterSpacing || {})) {
      letterSpacingObj[k] = v.$value
    }
    const sizeEntries = Object.entries(sizeObj).map(([k, v]) => `  ${quoteKey(k)}: ${v},`).join('\n')
    const lineHeightEntries = Object.entries(lineHeightObj).map(([k, v]) => `  ${quoteKey(k)}: ${v},`).join('\n')
    const weightEntries = Object.entries(weightObj).map(([k, v]) => `  ${k}: '${v}',`).join('\n')
    const letterSpacingEntries = Object.entries(letterSpacingObj).map(([k, v]) => `  ${quoteKey(k)}: ${v},`).join('\n')
    const faceEntries = def.face
      ? Object.entries(def.face).map(([w, map]) => `  ${w}: { normal: '${map.normal}' },`).join('\n')
      : ''
    return {
      sizeEntries,
      lineHeightEntries,
      weightEntries,
      letterSpacingEntries,
      faceEntries,
      fontFamilyWeb: def.fontFamily?.$value ?? '',
      fontFamilyNative: def.fontFamilyNative?.$value ?? '',
    }
  }
  const headingDef = buildFontDef('heading')
  const bodyDef = buildFontDef('body')

  const typographyTs = headingDef && bodyDef ? BANNER + `
/** Web font family for headings (use with createFont on web) */
export const FONT_FAMILY_HEADING_WEB = '${headingDef.fontFamilyWeb}'

/** Native font family for headings */
export const FONT_FAMILY_HEADING_NATIVE = '${headingDef.fontFamilyNative}'

/** Web font family for body (use with createFont on web) */
export const FONT_FAMILY_BODY_WEB = '${bodyDef.fontFamilyWeb}'

/** Native font family for body */
export const FONT_FAMILY_BODY_NATIVE = '${bodyDef.fontFamilyNative}'

/** Font definition for createFont (heading). Use with family/face from above based on platform. */
export const headingFontDef = {
  size: {
${headingDef.sizeEntries}
  },
  lineHeight: {
${headingDef.lineHeightEntries}
  },
  weight: {
${headingDef.weightEntries}
  },
  letterSpacing: {
${headingDef.letterSpacingEntries}
  },
  face: {
${headingDef.faceEntries}
  },
} as const

/** Font definition for createFont (body). Use with family/face from above based on platform. */
export const bodyFontDef = {
  size: {
${bodyDef.sizeEntries}
  },
  lineHeight: {
${bodyDef.lineHeightEntries}
  },
  weight: {
${bodyDef.weightEntries}
  },
  letterSpacing: {
${bodyDef.letterSpacingEntries}
  },
  face: {
${bodyDef.faceEntries}
  },
} as const
` : null

  // Shadow: build ShadowDef objects from shadows.json
  const shadowObj = shadowData?.shadow || {}
  const buildShadowDef = (token) => {
    if (!token || token.$type !== 'shadow') return null
    const ext = token.$extensions || {}
    const ios = ext['mojaui.ios'] || {}
    const android = ext['mojaui.android'] || {}
    return {
      web: { boxShadow: token.$value },
      ios: {
        shadowColor: ios.shadowColor ?? '#101828',
        shadowOffset: ios.shadowOffset ?? { width: 0, height: 0 },
        shadowOpacity: ios.shadowOpacity ?? 0,
        shadowRadius: ios.shadowRadius ?? 0,
      },
      android: { elevation: android.elevation ?? 0 },
    }
  }
  const escapeStr = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const formatShadowDef = (def) => {
    const web = escapeStr(def.web.boxShadow)
    const ios = def.ios
    return `    web: { boxShadow: '${web}' },
    ios: { shadowColor: '${ios.shadowColor}', shadowOffset: { width: ${ios.shadowOffset.width}, height: ${ios.shadowOffset.height} }, shadowOpacity: ${ios.shadowOpacity}, shadowRadius: ${ios.shadowRadius} },
    android: { elevation: ${def.android.elevation} }`
  }
  const shadowFamilyEntries = []
  for (const [family, sizes] of Object.entries(shadowObj)) {
    const sizeEntries = []
    for (const [size, token] of Object.entries(sizes || {})) {
      const def = buildShadowDef(token)
      if (def) {
        sizeEntries.push(`    ${size}: {\n${formatShadowDef(def)}\n    },`)
      }
    }
    shadowFamilyEntries.push(`  ${family}: {\n${sizeEntries.join('\n')}\n  },`)
  }
  const shadowTs = shadowFamilyEntries.length > 0 ? BANNER + `
export type ShadowFamily = 'compact' | 'wide' | 'anchored'
export type ShadowSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'bottom' | 'top' | 'left' | 'right'

export type ShadowDef = {
  web: { boxShadow: string }
  ios: {
    shadowColor: string
    shadowOffset: { width: number; height: number }
    shadowOpacity: number
    shadowRadius: number
  }
  android: { elevation: number }
}

export const shadows: Record<ShadowFamily, Partial<Record<ShadowSize, ShadowDef>>> = {
${shadowFamilyEntries.join('\n')}
}
` : null

  const mojauiTokensTs = BANNER + `
import { createTokens } from 'tamagui'

const RADIUS_SCALE = {
${radiusEntries.join('\n')}
}

export const RADIUS = { ...RADIUS_SCALE, input: RADIUS_SCALE.md } as const

export const BORDER_WIDTH = {
${borderWidthEntries}
} as const

export const size = {
${sizeEntries.join('\n')}
}

export const space = {
${spaceEntries.join('\n')}
}

export const zIndex = { ${Object.entries(zIndexObj).map(([k, v]) => `${k}: ${v}`).join(', ')} }

const radius = { ...RADIUS, true: RADIUS.md }

const color = {}

export const mojauiTokens = createTokens({
  color,
  radius,
  zIndex,
  space,
  size,
})
`

  const paletteStr = Object.entries(paletteObj).map(([k, v]) => `  ${k}: '${v}',`).join('\n')
  const lightStr = Object.entries(lightTheme).map(([k, v]) => `    ${k}: '${v}',`).join('\n')
  const darkStr = Object.entries(darkTheme).map(([k, v]) => `    ${k}: '${v}',`).join('\n')

  const colorsTs = BANNER + `
import { createTokens } from 'tamagui'

const basePalette = {
${paletteStr}
} as const

export const palette = {
  ...basePalette,
} as const

export const tokens = createTokens({ color: palette })

export const colorTheme = {
  light: {
${lightStr}
  },
  dark: {
${darkStr}
  },
} as const

export type Theme = typeof colorTheme.light
export type ThemeKeys = keyof Theme
`

  writeFileSync(path.join(GENERATED, 'mojaui_tokens.ts'), mojauiTokensTs, 'utf-8')
  writeFileSync(path.join(GENERATED, 'colors.ts'), colorsTs, 'utf-8')
  if (typographyTs) {
    writeFileSync(path.join(GENERATED, 'typography.ts'), typographyTs, 'utf-8')
    console.log('codegen: wrote', path.join(GENERATED, 'typography.ts'))
  }
  if (shadowTs) {
    writeFileSync(path.join(GENERATED, 'shadow.ts'), shadowTs, 'utf-8')
    console.log('codegen: wrote', path.join(GENERATED, 'shadow.ts'))
  }

  console.log('codegen: wrote', path.join(GENERATED, 'mojaui_tokens.ts'))
  console.log('codegen: wrote', path.join(GENERATED, 'colors.ts'))
  console.log('codegen: done')
}

try {
  main()
} catch (err) {
  console.error('generate-tamagui failed:', err)
  process.exit(1)
}
