"use client"

import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Spinner } from "@tradalab/lyra/ui"
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { v7 as uuidv7 } from "uuid"

import { ProxyForm, ProxyFormRef, PendingState } from "./proxy.form"
import { useProxyList } from "@/hooks/api/proxy.api"
import { ProxyReq as ProxyDO } from "@/types"

interface ProxyDialogProps {
  open: boolean
  onClose: () => void
}

export function ProxyDialog({ open, onClose }: ProxyDialogProps) {
  const { t } = useTranslation()
  const { data: proxyList = [], isLoading } = useProxyList()
  const [selected, setSelected] = useState<Partial<ProxyDO> | null>(null)
  const [pending, setPending] = useState<PendingState>({ save: false, delete: false })

  const formRef = useRef<ProxyFormRef>(null)

  const handleAdd = () => {
    setSelected({
      id: uuidv7(),
      protocol: "http",
      host: "127.0.0.1",
      port: 8080,
      username: "",
      password: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[700px] p-0 flex flex-col h-[80vh]"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{t("proxy_configurations")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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
              {proxyList.map(p => {
                const active = selected?.id === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`px-3 py-2 text-sm cursor-pointer border-l-2 ${active ? "bg-muted border-primary" : "border-transparent hover:bg-muted"}`}
                  >
                    [{p.protocol.toUpperCase()}] {p.host}:{p.port}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 p-4 overflow-auto">
            {selected && <ProxyForm ref={formRef} proxy={selected} onPendingChange={setPending} onDeleted={() => setSelected(null)} />}
          </div>
        </div>

        {/* Footer */}
        {selected && (
          <DialogFooter className="p-2 border-t flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending.delete} onClick={() => formRef.current?.handleDelete()}>
              {pending.delete ? <Spinner /> : <Trash2Icon className="w-4 h-4 mr-2" />}
              {t("delete")}
            </Button>
            <Button size="sm" variant="default" disabled={pending.save} onClick={() => formRef.current?.submit()}>
              {pending.save ? <Spinner /> : <SaveIcon className="w-4 h-4 mr-2" />}
              {t("save")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
