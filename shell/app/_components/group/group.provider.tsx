"use client"

import { ReactNode, useState } from "react"
import { GroupContext } from "./group.context"
import { GroupDialog } from "./group.dialog"
import { GroupItem as GroupDO } from "@/types"

export function GroupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState<Partial<GroupDO> | null>(null)

  const handleCreate = () => {
    setGroup({
      name: "",
    })
    setOpen(true)
  }

  const handleEdit = (item: GroupDO) => {
    setGroup(item)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setGroup(null)
  }

  return (
    <GroupContext.Provider
      value={{
        create: handleCreate,
        edit: handleEdit,
        close: handleClose,
      }}
    >
      {children}
      <GroupDialog open={open} onOpenChange={setOpen} group={group} />
    </GroupContext.Provider>
  )
}
