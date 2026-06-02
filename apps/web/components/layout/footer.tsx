import {
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiReddit,
  SiThreads,
  SiTiktok,
  SiX,
  SiYoutube
} from '@icons-pack/react-simple-icons'
import Image from 'next/image'
import Link from 'next/link'
import type { SVGProps } from 'react'
import { getRoute } from '@/lib/routes'
import { ModeToggle } from '../mode-toggle'

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037c-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85c3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.06 2.06 0 0 1-2.063-2.065a2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
    </svg>
  )
}

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/boxundefeated', Icon: SiFacebook },
  { label: 'GitHub', href: 'https://github.com/boxingundefeated', Icon: SiGithub },
  { label: 'Reddit', href: '#', Icon: SiReddit },
  { label: 'Twitter', href: 'https://x.com/boxundefeated', Icon: SiX },
  { label: 'Instagram', href: 'https://www.instagram.com/boxundefeated', Icon: SiInstagram },
  { label: 'YouTube', href: '#', Icon: SiYoutube },
  { label: 'Threads', href: '#', Icon: SiThreads },
  { label: 'TikTok', href: '#', Icon: SiTiktok },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/90466967/admin/dashboard/',
    Icon: LinkedinIcon
  }
]

export function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <h2 className="sr-only">Footer</h2>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
          <div className="space-y-3 md:col-span-2">
            <h3 className="font-semibold text-lg">🥊 Boxing Directory</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive database of professional boxers from around the world. Browse
              statistics, records, and fight history for thousands of fighters.
            </p>
            <div className="flex space-x-4 my-6">
              <ModeToggle />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Browse</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/boxers/" className="text-muted-foreground hover:text-foreground">
                  All Boxers
                </Link>
              </li>
              <li>
                <Link href="/divisions/" className="text-muted-foreground hover:text-foreground">
                  Divisions
                </Link>
              </li>
              <li>
                <Link
                  href="/divisions/heavy/"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Heavyweight
                </Link>
              </li>
              <li>
                <Link
                  href="/divisions/middle/"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Middleweight
                </Link>
              </li>
              <li>
                <Link
                  href="/divisions/light/"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Lightweight
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Information</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={getRoute('about')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href={getRoute('search')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Search
                </Link>
              </li>
              <li>
                <Link href="/sitemap/" className="text-muted-foreground hover:text-foreground">
                  Sitemap
                </Link>
              </li>
              <li>
                <Link href="/shop/" className="text-muted-foreground hover:text-foreground">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/brands/" className="text-muted-foreground hover:text-foreground">
                  Brands
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={getRoute('privacy')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getRoute('terms')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://boxingundefeated.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Boxing Undefeated
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/boxingundefeated"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t flex flex-col items-center gap-4">
          <a
            href="https://dr.serp.co/sites/boxingundefeated.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="https://dr.serp.co/badge/boxingundefeated.com?style=serp-dr-v3"
              alt="Verified DR 57 for boxingundefeated.com"
              width={200}
              height={50}
              unoptimized
            />
          </a>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Boxing Directory. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
