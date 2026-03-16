#!/usr/bin/env node
/**
 * Validate canonical DTCG token files.
 * Schema validation, reference checks, naming conventions, value ranges.
 * Run: pnpm --filter @ojanti/mojaui-tokens run validate
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PKG = path.resolve(__dirname, '..')
const SRC = path.join(TOKENS_PKG, 'src')
const COLORS_SRC = path.join(SRC, 'colors')

const errors = []

function loadJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (e) {
    errors.push(`Failed to load ${filePath}: ${e.message}`)
    return null
  }
}

function resolveRef(ref, palette) {
  const m = ref.match(/^\{palette\.(\w+)\}$/)
  if (!m) return null
  return palette[m[1]] ? palette[m[1]].$value : null
}

function validatePalette(palette) {
  if (!palette || typeof palette !== 'object') {
    errors.push('palette.json: missing or invalid palette')
    return
  }
  for (const [k, v] of Object.entries(palette)) {
    if (!v || typeof v !== 'object') {
      errors.push(`palette.json: invalid token "${k}"`)
      continue
    }
    if (v.$type !== 'color') {
      errors.push(`palette.json: token "${k}" must have $type: "color"`)
    }
    if (typeof v.$value !== 'string') {
      errors.push(`palette.json: token "${k}" must have $value string`)
    }
  }
}

function validateTheme(colorTheme, palette) {
  if (!colorTheme || typeof colorTheme !== 'object') {
    errors.push('theme.json: missing or invalid colorTheme')
    return
  }
  for (const mode of ['light', 'dark']) {
    if (!colorTheme[mode]) {
      errors.push(`theme.json: missing mode "${mode}"`)
      continue
    }
    for (const [k, v] of Object.entries(colorTheme[mode])) {
      if (!v || typeof v !== 'object') {
        errors.push(`theme.json: invalid token "${k}" in ${mode}`)
        continue
      }
      if (v.$type !== 'color') {
        errors.push(`theme.json: token "${k}" in ${mode} must have $type: "color"`)
      }
      const val = v.$value
      if (typeof val !== 'string') {
        errors.push(`theme.json: token "${k}" in ${mode} must have $value string`)
        continue
      }
      if (val.startsWith('{palette.') && val.endsWith('}')) {
        const resolved = resolveRef(val, palette)
        if (!resolved) {
          errors.push(`theme.json: token "${k}" in ${mode} references unknown palette: ${val}`)
        }
      }
      if (!/^(background|border|text|icon|surface|card|overlay|hover|transparent|skeleton|highlight)[A-Za-z0-9]+$/.test(k) && !['transparent', 'skeleton', 'highlight'].includes(k)) {
        if (!/^[a-z]+[A-Za-z0-9]*$/.test(k)) {
          errors.push(`theme.json: token "${k}" in ${mode} may not follow naming convention`)
        }
      }
    }
  }
}

function validateSpacing(spacing) {
  if (!spacing) return
  for (const group of ['space', 'size']) {
    const obj = spacing[group]
    if (!obj || typeof obj !== 'object') continue
    for (const [k, v] of Object.entries(obj)) {
      if (!v || typeof v !== 'object') {
        errors.push(`spacing.json: invalid token "${k}" in ${group}`)
        continue
      }
      if (v.$type !== 'dimension') {
        errors.push(`spacing.json: token "${k}" in ${group} must have $type: "dimension"`)
      }
      const val = v.$value
      if (typeof val !== 'string') {
        errors.push(`spacing.json: token "${k}" in ${group} must have $value string`)
        continue
      }
      const num = parseInt(val.replace(/px$/, ''), 10)
      if (group === 'space' && !k.startsWith('$-') && num < 0) {
        errors.push(`spacing.json: positive space token "${k}" has negative value`)
      }
    }
  }
}

function validateRadius(radius) {
  if (!radius || typeof radius !== 'object') return
  for (const [k, v] of Object.entries(radius)) {
    if (!v || typeof v !== 'object') {
      errors.push(`radius.json: invalid token "${k}"`)
      continue
    }
    if (v.$type !== 'dimension') {
      errors.push(`radius.json: token "${k}" must have $type: "dimension"`)
    }
    const val = v.$value
    if (typeof val !== 'string') {
      errors.push(`radius.json: token "${k}" must have $value string`)
      continue
    }
    const num = parseInt(val.replace(/px$/, ''), 10)
    if (num < 0) {
      errors.push(`radius.json: token "${k}" has negative value`)
    }
    if (k !== 'full' && num > 100 && num !== 9999) {
      errors.push(`radius.json: token "${k}" has unusually large value`)
    }
  }
}

function validateZIndex(zIndex) {
  if (!zIndex || typeof zIndex !== 'object') return
  for (const [k, v] of Object.entries(zIndex)) {
    if (!v || typeof v !== 'object') {
      errors.push(`zIndex.json: invalid token "${k}"`)
      continue
    }
    if (v.$type !== 'number') {
      errors.push(`zIndex.json: token "${k}" must have $type: "number"`)
    }
    if (typeof v.$value !== 'number') {
      errors.push(`zIndex.json: token "${k}" must have $value number`)
    }
  }
}

function main() {
  const paletteData = loadJson(path.join(COLORS_SRC, 'palette.json'))
  const palette = paletteData?.palette

  const themeData = loadJson(path.join(COLORS_SRC, 'theme.json'))

  if (paletteData) validatePalette(palette)
  if (themeData) validateTheme(themeData?.colorTheme, palette)

  const spacingData = loadJson(path.join(SRC, 'spacing.json'))
  if (spacingData) validateSpacing(spacingData)

  const radiusData = loadJson(path.join(SRC, 'radius.json'))
  if (radiusData) validateRadius(radiusData?.radius)

  const zIndexData = loadJson(path.join(SRC, 'zIndex.json'))
  if (zIndexData) validateZIndex(zIndexData?.zIndex)

  if (errors.length > 0) {
    console.error('Validation failed:')
    for (const e of errors) {
      console.error('  -', e)
    }
    process.exit(1)
  }
  console.log('validate: OK')
}

main()
