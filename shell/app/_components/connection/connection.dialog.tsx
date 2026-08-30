"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@tradalab/lyra/ui"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"

import { ConnectionReq as ConnectionDO } from "@/types"

import { ConnectionForm, ConnectionFormRef, PendingState } from "./connection.form"
import { Spinner } from "@tradalab/lyra/ui"
import { PlugIcon, SaveIcon } from "lucide-react"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  connection: Partial<ConnectionDO> | null
}

export function ConnectionDialog({ open, onOpenChange, connection }: Props) {
  const { t } = useTranslation()

  const formRef = useRef<ConnectionFormRef>(null)

  const [pending, setPending] = useState<PendingState>({
    save: false,
    test: false,
  })

  if (!connection) return null

  const isEdit = Boolean(connection.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] p-0 flex flex-col h-[85vh]"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{isEdit ? t("update_connection") : t("new_connection")}</DialogTitle>
        </DialogHeader>

        <ConnectionForm ref={formRef} connection={connection} onPendingChange={setPending} />

        <DialogFooter className="p-2 border-t flex gap-2">
          <Button size="sm" variant="outline" disabled={pending.test} onClick={() => formRef.current?.testConn()}>
            {pending.test ? <Spinner /> : <PlugIcon />}
            {t("test_conn")}
          </Button>
          <DialogClose asChild>
            <Button size="sm" variant="outline" disabled={pending.save || pending.test}>
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
