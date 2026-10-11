import { fireEvent, render, screen, within } from '@testing-library/react'
import { Header } from './header'

const navLinks = [
  ['Boxers', '/boxers/'],
  ['Divisions', '/divisions/'],
  ['About', '/about/'],
  ['Search', '/search/']
]

describe('Header', () => {
  it('links the main sections and not the empty blog', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation', { name: 'Main' })
    for (const [name, href] of navLinks) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href)
    }
    expect(document.querySelector('a[href="/blog/"]')).not.toBeInTheDocument()
  })

  it('opens the phone menu with the same links and closes it when one is chosen', () => {
    render(<Header />)

    const menuButton = screen.getByRole('button', { name: 'Menu' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(menuButton)

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    const phoneNav = screen.getAllByRole('navigation', { name: 'Main' })[1]
    expect(
      within(phoneNav)
        .getAllByRole('link')
        .map(link => link.getAttribute('href'))
    ).toEqual(navLinks.map(([, href]) => href))

    fireEvent.click(within(phoneNav).getByRole('link', { name: 'Divisions' }))

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1)
  })
})
