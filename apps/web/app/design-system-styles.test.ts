import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buttonVariants } from '@boxingundefeated/design-system/button'
import { Card } from '@boxingundefeated/design-system/card'
import { PopoverContent } from '@boxingundefeated/design-system/popover'
import tailwindcss from '@tailwindcss/postcss'
import postcss from 'postcss'
import type { ReactElement } from 'react'
import { beforeAll, expect, test } from 'vitest'

// Tailwind finds class names on its own only in apps/web, the app whose build compiles the
// stylesheet, so the classes that live only inside packages/design-system components are
// generated only through the stylesheet's `@source` line. Without them, cards and icon buttons
// render unstyled.
//
// The class names come from the components themselves: Tailwind scans this file too, so naming
// them here would generate them whatever the stylesheet says.
const APP_ROOT = join(__dirname, '..')
const STYLESHEET = join(APP_ROOT, '../../packages/design-system/styles/globals.css')

type WithClassName = ReactElement<{ className: string; children?: WithClassName }>

const components: Record<string, string> = {
  Card: (Card({}) as WithClassName).props.className,
  'Button, icon size': buttonVariants({ variant: 'ghost', size: 'icon' }),
  // PopoverContent renders its content inside a portal.
  PopoverContent: (PopoverContent({}) as WithClassName).props.children?.props.className ?? ''
}

// Plain utilities only: variants (`hover:`), arbitrary values and fractions need CSS escapes.
const plainUtilities = (className: string) =>
  className.split(/\s+/).filter(name => /^[a-z][a-z0-9-]*$/.test(name))

let css: string

beforeAll(async () => {
  // The same plugin and base directory as the app's build (postcss.config.js, run in apps/web).
  const result = await postcss([tailwindcss({ base: APP_ROOT })]).process(
    readFileSync(STYLESHEET, 'utf8'),
    { from: STYLESHEET }
  )
  css = result.css
})

test.each(Object.entries(components))('the stylesheet styles %s', (_, className) => {
  const utilities = plainUtilities(className)
  expect(utilities.length).toBeGreaterThan(3)
  const missing = utilities.filter(name => !new RegExp(`\\.${name}\\s*\\{`).test(css))
  expect(missing).toEqual([])
})
