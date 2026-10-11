import Link from 'next/link'
import * as React from 'react'
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Breadcrumb as ShadcnBreadcrumb
} from '../shadcn/breadcrumb'

/**
 * Represents a breadcrumb navigation item data
 */
export interface BreadcrumbItemData {
  name: string
  href: string
}

export interface BreadcrumbProps {
  /** The crumbs after Home, which the component adds itself: never pass a Home item. */
  items: BreadcrumbItemData[]
  homeHref?: string
  baseUrl?: string
}

/**
 * Breadcrumb component for navigation hierarchy with JSON-LD support. The component owns the Home
 * crumb, and the visible trail and the BreadcrumbList JSON-LD come from the same list, so they
 * show the same crumbs in the same order.
 *
 * @param props - Component properties
 * @param props.items - The crumbs after Home, ending with the current page
 * @param props.homeHref - Optional custom home link (defaults to '/')
 * @param props.baseUrl - The origin the JSON-LD item URLs are absolute to
 * @returns React component with breadcrumb navigation and structured data
 */
export function Breadcrumb({ items, homeHref = '/', baseUrl }: BreadcrumbProps) {
  const crumbs: BreadcrumbItemData[] = [{ name: 'Home', href: homeHref }, ...items]
  // The homepage is written as the bare origin (SERP URL trailing-slash standard).
  const absoluteUrl = (href: string) =>
    baseUrl && href === '/' ? baseUrl : `${baseUrl || ''}${href}`

  return (
    <div className="mb-4">
      <ShadcnBreadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {index > 0 && index === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </ShadcnBreadcrumb>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.name,
              item: absoluteUrl(crumb.href)
            }))
          })
        }}
      />
    </div>
  )
}
