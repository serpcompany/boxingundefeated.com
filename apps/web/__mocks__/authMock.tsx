import type { ReactNode } from 'react'

export function AuthProviderComponent({ children }: { children: ReactNode }) {
  return children
}

export function useAuth() {
  return {
    user: null,
    isLoading: false,
    signIn: () => undefined,
    signOut: () => undefined
  }
}
