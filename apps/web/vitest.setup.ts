import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'
import { afterEach, vi } from 'vitest'

// The App Router's hooks need the router's context, which a test doesn't render. A test that needs
// another pathname or `notFound()` mocks `next/navigation` itself.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({})
}))

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() })
}))

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))

// A plain anchor, so a test reads the `href` a page renders.
vi.mock('next/link', () => ({
  default: ({ children, ...props }: { children?: ReactNode }) => createElement('a', props, children)
}))

if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')
  // Testing Library unmounts after each test and tells React it runs under `act()` by itself only
  // when the test functions are globals, which they aren't here.
  afterEach(cleanup)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}
