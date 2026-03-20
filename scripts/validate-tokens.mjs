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

/** DTCG dimension: { value: number, unit: "px" | "rem" } */
function validateDimension(val, file, tokenPath) {
  if (typeof val !== 'object' || val === null) {
    errors.push(`${file}: token "${tokenPath}" must have $value as object { value, unit }`)
    return null
  }
  if (typeof val.value !== 'number') {
    errors.push(`${file}: token "${tokenPath}" $value.value must be a number`)
    return null
  }
  if (val.unit !== 'px' && val.unit !== 'rem') {
    errors.push(`${file}: token "${tokenPath}" $value.unit must be "px" or "rem"`)
    return null
  }
  return val.value
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
      const num = validateDimension(v.$value, 'spacing.json', `${group}.${k}`)
      if (num !== null && group === 'space' && !k.startsWith('$-') && num < 0) {
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
    const num = validateDimension(v.$value, 'radius.json', k)
    if (num !== null) {
      if (num < 0) {
        errors.push(`radius.json: token "${k}" has negative value`)
      }
      if (k !== 'full' && num > 100 && num !== 9999) {
        errors.push(`radius.json: token "${k}" has unusually large value`)
      }
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

function validateBorderWidth(borderWidth) {
  if (!borderWidth || typeof borderWidth !== 'object') return
  for (const [k, v] of Object.entries(borderWidth)) {
    if (!v || typeof v !== 'object') {
      errors.push(`borderWidth.json: invalid token "${k}"`)
      continue
    }
    if (v.$type !== 'dimension') {
      errors.push(`borderWidth.json: token "${k}" must have $type: "dimension"`)
    }
    const num = validateDimension(v.$value, 'borderWidth.json', k)
    if (num !== null && num < 0) {
      errors.push(`borderWidth.json: token "${k}" has negative value`)
    }
  }
}

function validateShadows(shadow) {
  if (!shadow || typeof shadow !== 'object') return
  const IOS_KEYS = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius']
  for (const [family, sizes] of Object.entries(shadow)) {
    if (!sizes || typeof sizes !== 'object') {
      errors.push(`shadows.json: invalid family "${family}"`)
      continue
    }
    for (const [size, token] of Object.entries(sizes)) {
      if (!token || typeof token !== 'object') {
        errors.push(`shadows.json: invalid token "${family}.${size}"`)
        continue
      }
      if (token.$type !== 'shadow') {
        errors.push(`shadows.json: token "${family}.${size}" must have $type: "shadow"`)
      }
      if (typeof token.$value !== 'string' || !token.$value.trim()) {
        errors.push(`shadows.json: token "${family}.${size}" must have non-empty $value string`)
      }
      const ext = token.$extensions
      if (ext && typeof ext === 'object') {
        const ios = ext['platform.ios']
        if (ios && typeof ios === 'object') {
          for (const key of IOS_KEYS) {
            if (!(key in ios)) {
              errors.push(`shadows.json: token "${family}.${size}" $extensions.platform.ios missing "${key}"`)
            }
          }
          if (ios.shadowOffset && (typeof ios.shadowOffset.width !== 'number' || typeof ios.shadowOffset.height !== 'number')) {
            errors.push(`shadows.json: token "${family}.${size}" $extensions.platform.ios.shadowOffset must have width and height numbers`)
          }
        }
        const android = ext['platform.android']
        if (android && typeof android === 'object') {
          if (typeof android.elevation !== 'number' || android.elevation < 0) {
            errors.push(`shadows.json: token "${family}.${size}" $extensions.platform.android.elevation must be non-negative number`)
          }
        }
      }
    }
  }
}

function validateTypography(typography) {
  if (!typography || typeof typography !== 'object') return
  
  // Validate typography.weight at root
  const sharedWeight = typography.weight
  if (sharedWeight && typeof sharedWeight === 'object') {
    for (const [k, v] of Object.entries(sharedWeight)) {
      if (!v || typeof v !== 'object') {
        errors.push(`typography.json: typography.weight.${k} invalid`)
        continue
      }
      if (v.$type !== 'number') {
        errors.push(`typography.json: typography.weight.${k} must have $type: "number"`)
      }
      if (typeof v.$value !== 'number') {
        errors.push(`typography.json: typography.weight.${k} must have $value number`)
      }
    }
  }
  
  for (const [role, def] of Object.entries(typography)) {
    // Skip 'weight' as it's the shared weight, not a font role
    if (role === 'weight') continue
    
    if (!def || typeof def !== 'object') {
      errors.push(`typography.json: invalid role "${role}"`)
      continue
    }
    for (const key of ['fontFamily', 'fontFamilyWeb', 'fontFamilyNative']) {
      const t = def[key]
      if (!t || typeof t !== 'object') continue
      if (t.$type !== 'fontFamily') {
        errors.push(`typography.json: ${role}.${key} must have $type: "fontFamily"`)
      }
      if (typeof t.$value !== 'string') {
        errors.push(`typography.json: ${role}.${key} must have $value string`)
      }
    }
    for (const group of ['size', 'lineHeight', 'paragraphSpacing']) {
      const obj = def[group]
      if (!obj || typeof obj !== 'object') continue
      for (const [k, v] of Object.entries(obj)) {
        if (!v || typeof v !== 'object') {
          errors.push(`typography.json: ${role}.${group}.${k} invalid`)
          continue
        }
        if (v.$type !== 'dimension') {
          errors.push(`typography.json: ${role}.${group}.${k} must have $type: "dimension"`)
        }
        validateDimension(v.$value, 'typography.json', `${role}.${group}.${k}`)
      }
    }
    // Only validate letterSpacing (weight is now at root, not per-role)
    const letterSpacing = def.letterSpacing
    if (letterSpacing && typeof letterSpacing === 'object') {
      for (const [k, v] of Object.entries(letterSpacing)) {
        if (!v || typeof v !== 'object') {
          errors.push(`typography.json: ${role}.letterSpacing.${k} invalid`)
          continue
        }
        if (v.$type !== 'number') {
          errors.push(`typography.json: ${role}.letterSpacing.${k} must have $type: "number"`)
        }
        if (typeof v.$value !== 'number') {
          errors.push(`typography.json: ${role}.letterSpacing.${k} must have $value number`)
        }
      }
    }
    // Optionally validate $extensions['platform.fontFace'] if present
    const faceData = def.$extensions?.['platform.fontFace']
    if (faceData && typeof faceData === 'object') {
      for (const [w, map] of Object.entries(faceData)) {
        if (!map || typeof map !== 'object' || typeof map.normal !== 'string') {
          errors.push(`typography.json: ${role}.$extensions['platform.fontFace'].${w} must have { normal: string }`)
        }
      }
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

  const borderWidthData = loadJson(path.join(SRC, 'borderWidth.json'))
  if (borderWidthData) validateBorderWidth(borderWidthData?.borderWidth)

  const typographyData = loadJson(path.join(SRC, 'typography.json'))
  if (typographyData) validateTypography(typographyData?.typography)

  const shadowData = loadJson(path.join(SRC, 'shadows.json'))
  if (shadowData) validateShadows(shadowData?.shadow)

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
