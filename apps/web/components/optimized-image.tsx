'use client'

import { cn } from '@boxingundefeated/design-system/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface OptimizedImageProps {
  /** A photo on this site (`/photos/<sha256>.<ext>`), or null for the placeholder. */
  src?: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

/**
 * A boxer photo, or a placeholder of the same size when there is no photo or it fails to load.
 * The photos are copies in R2 that the Worker serves (lib/worker/photos.ts); a boxer whose photo
 * isn't copied has none.
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width = 200,
  height = 200,
  priority = false
}: OptimizedImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  // The src that failed, so a new src gets its own attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  // A server-rendered image can fail before hydration attaches onError, so check on mount too.
  useEffect(() => {
    const image = imageRef.current
    if (src && image?.complete && image.naturalWidth === 0) setFailedSrc(src)
  }, [src])

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        // shrink-0 keeps the placeholder the photo's size in a flex row, as the img would be.
        className={cn(
          'bg-muted text-muted-foreground flex shrink-0 items-center justify-center',
          className
        )}
        style={{ width, height }}
      >
        <svg
          className="h-3/8 w-3/8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    )
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailedSrc(src)}
    />
  )
}
