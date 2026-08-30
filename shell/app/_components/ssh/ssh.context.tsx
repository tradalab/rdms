"use client"

import { createContext, useContext } from "react"

export type SshContextType = {
  open: () => void
  close: () => void
}

export const SshContext = createContext<SshContextType | null>(null)

export function useSsh() {
  const ctx = useContext(SshContext)

  if (!ctx) {
    throw new Error("useSsh must be used inside <SshProvider>")
  }

  return ctx
}
