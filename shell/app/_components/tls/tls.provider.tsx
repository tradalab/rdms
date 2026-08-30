"use client"

import { ReactNode, useState } from "react"
import { TlsContext } from "./tls.context"
import { TlsDialog } from "./tls.dialog"

export function TlsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <TlsContext.Provider
      value={{
        open: () => setOpen(true),
        close: () => setOpen(false),
      }}
    >
      {children}
      <TlsDialog open={open} onOpenChange={setOpen} />
    </TlsContext.Provider>
  )
}
