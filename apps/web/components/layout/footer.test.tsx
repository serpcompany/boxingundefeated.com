// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './footer'

describe('Footer', () => {
  it('has no placeholder links', () => {
    render(<Footer />)

    expect(document.querySelector('a[href="#"]')).not.toBeInTheDocument()
    for (const label of ['Reddit', 'YouTube', 'Threads', 'TikTok']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  })

  it('names the site Boxing Undefeated in its heading and copyright line', () => {
    render(<Footer />)

    expect(screen.getByRole('heading', { name: '🥊 Boxing Undefeated' })).toBeInTheDocument()
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Boxing Undefeated. All rights reserved.`)
    ).toBeInTheDocument()
    expect(screen.queryByText(/Boxing Directory/)).not.toBeInTheDocument()
  })

  it('links the site itself relatively, so each environment links to its own origin', () => {
    render(<Footer />)

    const homeLink = screen.getByRole('link', { name: 'Boxing Undefeated' })
    expect(homeLink).toHaveAttribute('href', '/')
    expect(homeLink).not.toHaveAttribute('target')
    expect(
      document.querySelector('a[href^="https://boxingundefeated.com"]')
    ).not.toBeInTheDocument()
  })
})
