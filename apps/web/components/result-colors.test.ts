import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The fight history (fight-history.tsx) writes each result as text on the card in its result
// color. WCAG AA asks 4.5:1 of text this size in both themes (#75). The colors are HSL triples in
// the design system's stylesheet: `:root` is the light theme, and `.dark` overrides some of them.
const STYLESHEET = join(__dirname, '../../../packages/design-system/styles/globals.css')
const AA_TEXT = 4.5

function tokens(css: string, selector: string): Record<string, string> {
  const block = new RegExp(`(?:^|\\n)\\s*${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(
    css
  )?.[1]
  if (!block) throw new Error(`no ${selector} block in globals.css`)
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  )
}

/** An `H S% L%` triple to sRGB channels in 0..1. */
function hslToRgb(triple: string): [number, number, number] {
  const [h, s, l] = triple.split(/\s+/).map(part => Number.parseFloat(part))
  const saturation = s / 100
  const lightness = l / 100
  const a = saturation * Math.min(lightness, 1 - lightness)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4)]
}

function relativeLuminance(triple: string): number {
  const [r, g, b] = hslToRgb(triple).map(c =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const css = readFileSync(STYLESHEET, 'utf8')
const light = tokens(css, ':root')
const themes = { light, dark: { ...light, ...tokens(css, '.dark') } }

/** Text color token, background token. */
const pairs: [string, string][] = [
  ['win', 'card'],
  ['loss', 'card'],
  ['draw', 'card']
]

describe.each(Object.entries(themes))('result colors in the %s theme', (_, theme) => {
  it.each(pairs)('--%s on --%s meets WCAG AA for text', (text, background) => {
    expect(contrast(theme[text], theme[background])).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

it('measures contrast as WCAG does', () => {
  expect(contrast('0 0% 0%', '0 0% 100%')).toBeCloseTo(21)
  // Tailwind's green-600 on white, the light theme's win color before #75.
  expect(contrast('142.3 100% 32.6%', '0 0% 100%')).toBeCloseTo(3.21, 2)
})
