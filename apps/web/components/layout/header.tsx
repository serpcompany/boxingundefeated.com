'use client'
import { Button } from '@boxingundefeated/design-system/button'
import { cn } from '@boxingundefeated/design-system/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@boxingundefeated/design-system/popover'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getRoute } from '@/lib/routes'

const navItems = [
  { href: getRoute('website.list'), label: 'Boxers' },
  { href: '/divisions/', label: 'Divisions' },
  { href: getRoute('about'), label: 'About' },
  { href: getRoute('search'), label: 'Search' }
]

interface NavLinkProps {
  href: string
  children: React.ReactNode
  exact?: boolean
  className?: string
  onClick?: () => void
}

function NavLink({ href, children, exact = false, className, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const normalizedPathname = pathname === '/' || pathname.endsWith('/') ? pathname : `${pathname}/`
  const isActive = exact ? normalizedPathname === href : normalizedPathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'text-sm transition-colors',
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  )
}

/** The phone navigation: the same links as the desktop nav, in a popover under a menu button. */
function PhoneMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the menu whenever the URL changes, including browser back and forward, which never
  // click a menu link.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Tailwind scans only apps/web, not packages/design-system, so a stock component's own classes
  // are generated only when apps/web names them too: the button's size and the popover's
  // background and shadow are repeated here. (A size-* class here would also resize the theme
  // toggle, which renders the same Button.)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label="Menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Site navigation"
        className="w-56 bg-popover p-2 text-popover-foreground shadow-md"
      >
        <nav aria-label="Main" className="flex flex-col">
          {navItems.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-base hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  )
}

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={getRoute('home')} className="font-bold text-xl">
            🥊 Boxing Directory
          </Link>
          <nav aria-label="Main" className="hidden md:flex items-center gap-4">
            {navItems.map(({ href, label }) => (
              <NavLink key={href} href={href}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <PhoneMenu />
      </div>
    </header>
  )
}
