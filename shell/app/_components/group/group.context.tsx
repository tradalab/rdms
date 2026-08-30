"use client"

import { createContext, useContext } from "react"
import { GroupItem as GroupDO } from "@/types"

export type GroupContextType = {
  create: () => void
  edit: (group: GroupDO) => void
  close: () => void
}

export const GroupContext = createContext<GroupContextType | null>(null)

export function useGroup() {
  const ctx = useContext(GroupContext)

  if (!ctx) {
    throw new Error("useGroup must be used inside <GroupProvider>")
  }

  return ctx
}
