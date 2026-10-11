'use client'

import { useEffect, useRef, useState } from 'react'
import { resizeHeroImage } from '@/lib/hero-image'

interface HeroImageProps {
  src: string
  alt: string
  /** The `sizes` of the box the image fills, which picks its width from the still's `srcSet`. */
  sizes: string
  className?: string
  loading?: 'eager' | 'lazy'
}

/**
 * A shop article's hero as a still, at the width its box needs (lib/hero-image.ts). If the still
 * fails to load, the hero as the article links it takes its place, so a failed resize never leaves
 * a broken image.
 */
export function HeroImage({ src, alt, sizes, className, loading }: HeroImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  // The hero whose still failed, so a new hero gets its own attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const still = failedSrc === src ? null : resizeHeroImage(src)
  const stillSrc = still?.src

  // A server-rendered still can fail before hydration attaches onError, so check on mount too.
  useEffect(() => {
    const image = imageRef.current
    if (stillSrc && image?.complete && image.naturalWidth === 0) setFailedSrc(src)
  }, [src, stillSrc])

  return (
    <img
      ref={imageRef}
      src={still?.src ?? src}
      srcSet={still?.srcSet}
      sizes={still ? sizes : undefined}
      width={still?.width}
      height={still?.height}
      alt={alt}
      className={className}
      loading={loading}
      onError={still ? () => setFailedSrc(src) : undefined}
    />
  )
}
