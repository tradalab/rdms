"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Spinner } from "@tradalab/lyra/ui"
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { TlsReq as TlsDO } from "@/types"
import { useTlsList } from "@/hooks/api/tls.api"
import { TlsForm, TlsFormRef, PendingState } from "./tls.form"
import { v7 as uuidv7 } from "uuid"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TlsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { data: tlsList = [], isLoading } = useTlsList()
  const [selected, setSelected] = useState<Partial<TlsDO> | null>(null)
  const [pending, setPending] = useState<PendingState>({ save: false, delete: false })

  const formRef = useRef<TlsFormRef>(null)

  const handleAdd = () => {
    setSelected({
      id: uuidv7(),
      name: "",
      use_sni: false,
      server_name: "",
      verify: true,
      client_auth: false,
      ca_cert: "",
      cert: "",
      key: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] p-0 flex flex-col h-[85vh]"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{t("tls_configurations")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[260px] border-r flex flex-col">
            <div className="flex items-center gap-1 p-2 border-b">
              <Button size="icon" variant="ghost" onClick={handleAdd}>
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="p-4 flex justify-center">
                  <Spinner />
                </div>
              )}
              {tlsList.map(tls => {
                const active = selected?.id === tls.id
                const displayName = tls.name || tls.server_name || "Custom TLS Config"
                return (
                  <div
                    key={tls.id}
                    onClick={() => setSelected(tls as TlsDO)}
                    className={`px-3 py-2 text-sm cursor-pointer border-l-2 ${active ? "bg-muted border-primary" : "border-transparent hover:bg-muted"}`}
                  >
                    {displayName}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {selected && <TlsForm ref={formRef} tls={selected} onPendingChange={setPending} onDeleted={() => setSelected(null)} />}
          </div>
        </div>

        {selected && (
          <DialogFooter className="p-2 border-t flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending.delete} onClick={() => formRef.current?.handleDelete()}>
              {pending.delete ? <Spinner /> : <Trash2Icon />}
              Delete
            </Button>
            <Button size="sm" variant="default" disabled={pending.save} onClick={() => formRef.current?.submit()}>
              {pending.save ? <Spinner /> : <SaveIcon />}
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
