"use client"

import { createContext, useContext } from "react"

interface UpdaterContextType {
  loading: boolean
  newVersion: string | undefined
  notes: string | undefined
  checkUpdate: (options?: { silent?: boolean }) => Promise<{ new_version: string; notes: string } | null>
  fullUpdate: () => Promise<void>
  popup: () => void
}

export const UpdaterContext = createContext<UpdaterContextType | undefined>(undefined)

export const useUpdater = () => {
  const context = useContext(UpdaterContext)
  if (!context) {
    throw new Error("useUpdater must be used within an UpdaterProvider")
  }
  return context
}
