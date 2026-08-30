"use client"

import { createContext, useContext } from "react"

export type TlsContextType = {
  open: () => void
  close: () => void
}

export const TlsContext = createContext<TlsContextType | null>(null)

export function useTls() {
  const ctx = useContext(TlsContext)

  if (!ctx) {
    throw new Error("useTls must be used inside <TlsProvider>")
  }

  return ctx
}
