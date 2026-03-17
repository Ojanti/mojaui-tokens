#!/usr/bin/env node
/**
 * One-time extraction: read Tamagui theme files and write W3C DTCG JSON to packages/tokens/src/.
 * Use for initial migration or when re-extracting from Tamagui after local edits.
 * Run: pnpm --filter @ojanti/mojaui-tokens run extract
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PKG = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(TOKENS_PKG, '../..')
const CORE_THEME = path.join(REPO_ROOT, 'packages/mojaui-core/src/theme')
const SRC = path.join(TOKENS_PKG, 'src')
const COLORS_SRC = path.join(SRC, 'colors')

function extractPalette(content) {
  const palette = {}
  const re = /(\w+):\s*'([^']+)'/g
  let m
  while ((m = re.exec(content)) !== null) {
    palette[m[1]] = { $type: 'color', $value: m[2] }
  }
  return palette
}

function extractColorTheme(content) {
  const colorTheme = { light: {}, dark: {} }
  const modeRe = /(light|dark):\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs
  let modeMatch
  while ((modeMatch = modeRe.exec(content)) !== null) {
    const mode = modeMatch[1]
    const block = modeMatch[2]
    const pairRe = /(\w+):\s*palette\.(\w+)/g
    let pairMatch
    while ((pairMatch = pairRe.exec(block)) !== null) {
      colorTheme[mode][pairMatch[1]] = {
        $type: 'color',
        $value: `{palette.${pairMatch[2]}}`,
      }
    }
    const literalRe = /(\w+):\s*'([^']+)'/g
    while ((pairMatch = literalRe.exec(block)) !== null) {
      if (!colorTheme[mode][pairMatch[1]]) {
        colorTheme[mode][pairMatch[1]] = {
          $type: 'color',
          $value: pairMatch[2],
        }
      }
    }
  }
  return colorTheme
}

function dimensionValue(num) {
  return { $type: 'dimension', $value: { value: parseInt(num, 10), unit: 'px' } }
}

function extractSpace(content) {
  const space = {}
  const re = /\$(-?\d+):\s*(-?\d+)/g
  let m
  while ((m = re.exec(content)) !== null) {
    const key = m[1].startsWith('-') ? `$${m[1]}` : `$${m[1]}`
    space[key] = dimensionValue(m[2])
  }
  const trueRe = /\$true:\s*(\d+)/g
  while ((m = trueRe.exec(content)) !== null) {
    if (!space.$true) space.$true = dimensionValue(m[1])
  }
  return space
}

function extractSize(content) {
  const size = {}
  const sizeBlockRe = /size\s*=\s*\{([^}]+)\}/
  const match = content.match(sizeBlockRe)
  if (!match) return size
  const block = match[1]
  const re = /\$(\d+|\w+):\s*(\d+)/g
  let m
  while ((m = re.exec(block)) !== null) {
    const key = m[1] === 'true' ? '$true' : `$${m[1]}`
    size[key] = dimensionValue(m[2])
  }
  return size
}

function extractRadius(content) {
  const radius = {}
  const scaleRe = /(none|xs|sm|md|lg|xl|'2xl'|'3xl'|'4xl'|full):\s*(\d+)/g
  let m
  while ((m = scaleRe.exec(content)) !== null) {
    const k = m[1].replace(/'/g, '')
    radius[k] = dimensionValue(k === 'full' ? 9999 : m[2])
  }
  const inputRe = /input:\s*RADIUS_SCALE\.(\w+)/
  const inputMatch = content.match(inputRe)
  if (inputMatch && radius[inputMatch[1]]) {
    radius.input = { $type: 'dimension', $value: radius[inputMatch[1]].$value }
  } else if (!radius.input) {
    radius.input = dimensionValue(8)
  }
  return radius
}

function extractZIndex(content) {
  const zIndex = {}
  const re = /zIndex\s*=\s*\{\s*([^}]+)\s*\}/s
  const match = content.match(re)
  if (!match) return { 0: { $type: 'number', $value: 0 }, 1: { $type: 'number', $value: 100 }, 2: { $type: 'number', $value: 200 }, 3: { $type: 'number', $value: 300 }, 4: { $type: 'number', $value: 400 }, 5: { $type: 'number', $value: 500 } }
  const inner = match[1]
  const pairs = inner.match(/(\d+):\s*(\d+)/g) || []
  for (const p of pairs) {
    const [k, v] = p.split(':').map((x) => x.trim())
    zIndex[k] = { $type: 'number', $value: parseInt(v, 10) }
  }
  return zIndex
}

function main() {
  mkdirSync(COLORS_SRC, { recursive: true })

  const colorsContent = readFileSync(path.join(CORE_THEME, 'colors.ts'), 'utf-8')
  const tokensContent = readFileSync(path.join(CORE_THEME, 'mojaui_tokens.ts'), 'utf-8')

  const paletteRaw = extractPalette(colorsContent)
  const cardOnSurface = 'rgba(242, 244, 247, 0.07)'
  const palette = {
    ...paletteRaw,
    cardOnSurface: { $type: 'color', $value: cardOnSurface },
  }

  const paletteJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $description: 'Raw color palette (basePalette) for MojaUI. Canonical source of truth.',
    palette,
  }
  writeFileSync(path.join(COLORS_SRC, 'palette.json'), JSON.stringify(paletteJson, null, 2), 'utf-8')
  console.log('extract: wrote', path.join(COLORS_SRC, 'palette.json'))

  const colorTheme = extractColorTheme(colorsContent)
  const themeJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $description: 'Semantic color theme tokens (light/dark modes). References palette.',
    colorTheme,
  }
  writeFileSync(path.join(COLORS_SRC, 'theme.json'), JSON.stringify(themeJson, null, 2), 'utf-8')
  console.log('extract: wrote', path.join(COLORS_SRC, 'theme.json'))

  const space = extractSpace(tokensContent)
  const size = extractSize(tokensContent)
  const spacingJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $description: 'Space and size scales for MojaUI. Contains both space (layout) and size (dimension) tokens.',
    space,
    size,
  }
  writeFileSync(path.join(SRC, 'spacing.json'), JSON.stringify(spacingJson, null, 2), 'utf-8')
  console.log('extract: wrote', path.join(SRC, 'spacing.json'))

  const radius = extractRadius(tokensContent)
  const radiusJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $description: 'Border radius scale for MojaUI.',
    radius,
  }
  writeFileSync(path.join(SRC, 'radius.json'), JSON.stringify(radiusJson, null, 2), 'utf-8')
  console.log('extract: wrote', path.join(SRC, 'radius.json'))

  const zIndex = extractZIndex(tokensContent)
  const zIndexJson = {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $description: 'Z-index scale for MojaUI.',
    zIndex,
  }
  writeFileSync(path.join(SRC, 'zIndex.json'), JSON.stringify(zIndexJson, null, 2), 'utf-8')
  console.log('extract: wrote', path.join(SRC, 'zIndex.json'))

  console.log('extract: done')
}

try {
  main()
} catch (err) {
  console.error('extract-tokens-to-dtcg failed:', err)
  process.exit(1)
}
