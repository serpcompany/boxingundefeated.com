import type { ThemeProviderProps } from 'next-themes'
import { Toaster } from './components/shadcn/sonner'
import { TooltipProvider } from './components/shadcn/tooltip'
import { ThemeProvider } from './providers/theme'

interface DesignSystemProviderProperties extends ThemeProviderProps {}

export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => {
  const content = (
    <>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </>
  )

  return <ThemeProvider {...properties}>{content}</ThemeProvider>
}
