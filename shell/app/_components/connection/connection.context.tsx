"use client"

import { createContext, useContext } from "react"
import { ConnectionReq as ConnectionDO } from "@/types"

export type ConnectionContextType = {
  create: () => void
  edit: (conn: ConnectionDO) => void
  close: () => void
}

export const ConnectionContext = createContext<ConnectionContextType | null>(null)

export function useConnection() {
  const ctx = useContext(ConnectionContext)

  if (!ctx) {
    throw new Error("useConnection must be used inside <ConnectionProvider>")
  }

  return ctx
}
