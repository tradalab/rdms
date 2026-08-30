"use client"

import { createContext, useContext } from "react"
import { ProxyReq as ProxyDO } from "@/types"

interface ProxyContextProps {
  open?: (initialValues?: Partial<ProxyDO>) => void
  close?: () => void
}

export const ProxyContext = createContext<ProxyContextProps>({})

export const useProxy = () => useContext(ProxyContext)
