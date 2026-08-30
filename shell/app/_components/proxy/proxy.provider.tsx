"use client"

import { ReactNode, useState } from "react"
import { ProxyContext } from "./proxy.context"
import { ProxyDialog } from "./proxy.dialog"
import { ProxyReq as ProxyDO } from "@/types"

export function ProxyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <ProxyContext.Provider value={{ open: handleOpen, close: handleClose }}>
      {children}
      <ProxyDialog open={open} onClose={handleClose} />
    </ProxyContext.Provider>
  )
}
