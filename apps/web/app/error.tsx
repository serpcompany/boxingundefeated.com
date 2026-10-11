'use client'

import { Button } from '@boxingundefeated/design-system/button'
import { useEffect } from 'react'

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container relative mx-auto flex flex-col items-center justify-center px-4">
      <div className="mx-auto flex h-screen flex-col items-center justify-center">
        <div className="flex h-full flex-col items-center justify-center">
          <span className="not-found rounded-md px-3.5 py-1 text-sm font-medium text-foreground">
            Error
          </span>
          <h1 className="mt-5 text-3xl font-bold text-foreground md:text-5xl">
            Something went wrong!
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-base font-medium text-muted-foreground">
            An unexpected error occurred. Please try again later.
          </p>
          <Button onClick={reset} className="mt-8">
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
