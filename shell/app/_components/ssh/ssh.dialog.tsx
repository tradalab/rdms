"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Spinner } from "@tradalab/lyra/ui"
import { PlugIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { SshReq as SshDO } from "@/types"
import { useSshList } from "@/hooks/api/ssh.api"
import { SshForm, SshFormRef, PendingState } from "./ssh.form"
import { SshKindEnum } from "@/types/ssh-kind.enum"
import { useTranslation } from "react-i18next"
import { v7 as uuidv7 } from "uuid"

export type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function SshDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { data: sshList = [], isLoading } = useSshList()
  const [selected, setSelected] = useState<Partial<SshDO> | null>(null)
  const [pending, setPending] = useState<PendingState>({ save: false, test: false, delete: false })

  const formRef = useRef<SshFormRef>(null)

  const handleAdd = () => {
    setSelected({
      id: uuidv7(),
      host: "127.0.0.1",
      port: 22,
      timeout: 60,
      username: "",
      kind: SshKindEnum.PASSWORD,
      password: "",
      private_key: "",
      passphrase: "",
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
          <DialogTitle className="text-sm">{t("ssh_configurations")}</DialogTitle>
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
              {sshList.map(ssh => {
                const active = selected?.id === ssh.id
                return (
                  <div
                    key={ssh.id}
                    onClick={() => setSelected(ssh as SshDO)}
                    className={`px-3 py-2 text-sm cursor-pointer border-l-2 ${active ? "bg-muted border-primary" : "border-transparent hover:bg-muted"}`}
                  >
                    {ssh.username}@{ssh.host}:{ssh.port}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {selected && <SshForm ref={formRef} ssh={selected} onPendingChange={setPending} onDeleted={() => setSelected(null)} />}
          </div>
        </div>

        {selected && (
          <DialogFooter className="p-2 border-t flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending.delete} onClick={() => formRef.current?.handleDelete()}>
              {pending.delete ? <Spinner /> : <Trash2Icon />}
              {t("delete")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending.test} onClick={() => formRef.current?.testConn()}>
              {pending.test ? <Spinner /> : <PlugIcon />}
              {t("test_conn")}
            </Button>
            <Button size="sm" variant="default" disabled={pending.save} onClick={() => formRef.current?.submit()}>
              {pending.save ? <Spinner /> : <SaveIcon />}
              {t("save")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
