import { render, screen } from '@testing-library/react'
import { Footer } from './footer'

describe('Footer', () => {
  it('has no placeholder links', () => {
    render(<Footer />)

    expect(document.querySelector('a[href="#"]')).not.toBeInTheDocument()
    for (const label of ['Reddit', 'YouTube', 'Threads', 'TikTok']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
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
