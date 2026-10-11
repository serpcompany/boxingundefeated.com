import { fireEvent, render, screen, within } from '@testing-library/react'
import { Header } from './header'

// The URL the header renders at; a test changes it to stand in for a navigation.
let mockPathname = '/'
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))

const navLinks = [
  ['Boxers', '/boxers/'],
  ['Divisions', '/divisions/'],
  ['About', '/about/'],
  ['Search', '/search/']
]

describe('Header', () => {
  beforeEach(() => {
    mockPathname = '/'
  })

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
    expect(screen.getByRole('dialog', { name: 'Site navigation' })).toBeInTheDocument()
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

  it('closes the phone menu on any URL change, such as back or forward', () => {
    const { rerender } = render(<Header />)
    const menuButton = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(menuButton)
    expect(screen.getByRole('dialog', { name: 'Site navigation' })).toBeInTheDocument()

    mockPathname = '/boxers/'
    rerender(<Header />)

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
