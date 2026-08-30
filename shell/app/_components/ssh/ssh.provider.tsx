"use client"

import { ReactNode, useState } from "react"
import { SshContext } from "./ssh.context"
import { SshDialog } from "./ssh.dialog"

export function SshProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <SshContext.Provider
      value={{
        open: () => setOpen(true),
        close: () => setOpen(false),
      }}
    >
      {children}
      <SshDialog open={open} onOpenChange={setOpen} />
    </SshContext.Provider>
  )
}
