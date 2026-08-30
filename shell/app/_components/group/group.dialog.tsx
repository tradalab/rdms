"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@tradalab/lyra/ui"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"
import { GroupForm, GroupFormRef, PendingState } from "./group.form"
import { Spinner } from "@tradalab/lyra/ui"
import { SaveIcon } from "lucide-react"
import { GroupItem as GroupDO } from "@/types"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  group: Partial<GroupDO> | null
}

export function GroupDialog({ open, onOpenChange, group }: Props) {
  const { t } = useTranslation()

  const formRef = useRef<GroupFormRef>(null)
  const [pending, setPending] = useState<PendingState>({ save: false })

  if (!group) return null

  const isEdit = Boolean(group.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 flex flex-col" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{isEdit ? t("update_group") : t("new_group")}</DialogTitle>
        </DialogHeader>

        <GroupForm ref={formRef} group={group} onPendingChange={setPending} />

        <DialogFooter className="p-2 border-t flex gap-2">
          <DialogClose asChild>
            <Button size="sm" variant="outline" disabled={pending.save}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            size="sm"
            variant="default"
            disabled={pending.save}
            onClick={async () => {
              const ok = await formRef.current?.submit()
              if (ok) onOpenChange(false)
            }}
          >
            {pending.save ? <Spinner /> : <SaveIcon />}
            {isEdit ? t("update") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
