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

  const palette = paletteData.palette
  const colorTheme = themeData.colorTheme

  const quoteKey = (k) => /^\d|[-.]/.test(k) ? `'${k}'` : k
  const spaceEntries = Object.entries(spacingData.space || {}).map(([k, v]) => {
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
    return [`  ${quoteKey(k)}: ${num},`]
  }).flat()
  const sizeEntries = Object.entries(spacingData.size || {}).map(([k, v]) => {
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
    return [`  ${quoteKey(k)}: ${num},`]
  }).flat()

  const radiusEntries = Object.entries(radiusData.radius || {}).map(([k, v]) => {
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
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
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
    spaceObj[k] = num
  }
  const sizeObj = {}
  for (const [k, v] of Object.entries(spacingData.size || {})) {
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
    sizeObj[k] = num
  }
  const radiusObj = {}
  for (const [k, v] of Object.entries(radiusData.radius || {})) {
    const num = parseInt(String(v.$value).replace(/px$/, ''), 10)
    radiusObj[k] = num
  }
  const zIndexObj = {}
  for (const [k, v] of Object.entries(zIndexData.zIndex || {})) {
    zIndexObj[k] = v.$value
  }

  const mojauiTokensTs = BANNER + `
import { createTokens } from 'tamagui'

const RADIUS_SCALE = {
${radiusEntries.join('\n')}
}

export const RADIUS = { ...RADIUS_SCALE, input: RADIUS_SCALE.md } as const

export const BORDER_WIDTH = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 4,
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
