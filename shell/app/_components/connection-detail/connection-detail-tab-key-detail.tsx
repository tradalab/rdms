"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { useTabStore } from "@/stores/tab.store"
import { CodeEditor } from "@/app/_components/code-editor"
import { KeyDetailHash } from "@/app/_components/key-detail/key-detail-hash"
import { KeyDetailList } from "@/app/_components/key-detail/key-detail-list"
import { KeyDetailSet } from "@/app/_components/key-detail/key-detail-set"
import { KeyDetailZset } from "@/app/_components/key-detail/key-detail-zset"
import { KeyDetailStream } from "@/app/_components/key-detail/key-detail-stream"
import { KeyDetailString } from "@/app/_components/key-detail/key-detail-string"
import { KeyDetailJson } from "@/app/_components/key-detail/key-detail-json"
import { KeyDetailGraph } from "@/app/_components/key-detail/key-detail-graph"
import { Input, toast } from "@tradalab/lyra/ui"
import { CopyIcon, RefreshCcwIcon, SaveIcon, TimerIcon, Trash2Icon } from "lucide-react"
import { cn, formatDuration, formatFileSize } from "@/lib/utils"
import { KindBadge } from "@/app/_components/key-detail/key-detail-shared"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@tradalab/lyra/ui"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { Button } from "@tradalab/lyra/ui"
import { useKeyDelete, useKeyDetail, useKeyNameUpdate, useKeyTtlUpdate } from "@/hooks/api/client.api"
import { useReadOnly } from "@/hooks/api/connection.api"
import { Spinner } from "@tradalab/lyra/ui"
import { ButtonGroup, ButtonGroupText } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@tradalab/lyra/blocks"

export function ConnectionDetailTabKeyDetail({ connectionId, databaseIdx, selectedKey }: { connectionId: string; databaseIdx: number; selectedKey?: string }) {
  const { t } = useTranslation()
  const [reloadToken, setReloadToken] = useState<number>(0)
  const confirm = useConfirm()

  const [newKeyName, setNewKeyName] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)

  const { updateTab, removeTab, activeTabId } = useTabStore()

  const readOnly = useReadOnly(connectionId)

  const query = useKeyDetail(connectionId, databaseIdx, selectedKey)
  const detail = query.data

  const { kind, displayValue } = useMemo(() => {
    if (!detail) return { kind: undefined as string | undefined, displayValue: undefined as string | undefined }
    const k = detail.kind
    const v = detail.value
    if (k === "string" && typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
      try {
        return { kind: "json", displayValue: JSON.stringify(JSON.parse(v), null, 2) }
      } catch {}
    }
    return { kind: k, displayValue: v }
  }, [detail])

  const ttl = detail?.ttl

  // Header metadata: element count for collections, character length for strings.
  // A graph has neither - its node and edge counts belong to the graph view.
  const lengthValue = useMemo(() => {
    if (!detail || kind === "graphdata") return null
    if (kind && kind !== "string" && kind !== "json") return detail.total ?? 0
    return typeof displayValue === "string" ? displayValue.length : 0
  }, [detail, kind, displayValue])

  const ttlText = useMemo(() => {
    if (ttl === undefined) return "—"
    if (ttl === -1) return t("no_expiry")
    if (ttl === -2) return t("expired")
    return formatDuration(ttl)
  }, [ttl, t])

  const updateKeyMutation = useKeyNameUpdate(connectionId, databaseIdx)
  const deleteKeyMutation = useKeyDelete(connectionId, databaseIdx)

  const copyKeyName = async () => {
    if (!selectedKey) return
    try {
      await navigator.clipboard.writeText(selectedKey)
      toast.add({ title: t("copied"), type: "success" })
    } catch {
      toast.add({ title: t("unknown_error"), type: "error" })
    }
  }

  useEffect(() => {
    setNewKeyName(undefined)
  }, [selectedKey])

  useEffect(() => {
    if (query.error) {
      const msg = query.error instanceof Error ? query.error.message : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }, [query.error, t])

  const updateKeyName = async () => {
    if (!newKeyName || !selectedKey || !activeTabId) return
    try {
      await updateKeyMutation.mutateAsync({
        connection_id: connectionId,
        database_index: databaseIdx,
        current_name: selectedKey,
        new_name: newKeyName,
      })
      updateTab(activeTabId, { key: newKeyName, title: newKeyName })
      toast.add({ title: t("updated"), type: "success" })
    } catch (e: any) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }

  const reload = () => {
    query.refetch()
    setReloadToken(n => n + 1)
  }

  const handleDelete = async (key: string) => {
    if (deleteKeyMutation.isPending) return
    const ok = await confirm({
      title: t("confirm_delete"),
      description: t("confirm_delete_desc", { obj_name: "key", obj_key: selectedKey }),
      confirmText: t("delete"),
      danger: true,
    })
    if (ok && activeTabId) {
      try {
        await deleteKeyMutation.mutateAsync({ connection_id: connectionId, database_index: databaseIdx, key })
        removeTab(activeTabId)
        toast.add({ title: t("deleted"), type: "success" })
      } catch (e: any) {
        toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
      }
    }
  }

  if (query.isLoading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!connectionId || !selectedKey || ttl === undefined) {
    return null
  }

  return (
    <div className="flex flex-col min-h-0 gap-2 w-full h-full">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <ButtonGroup className="min-w-0 flex-1">
            <ButtonGroupText asChild>
              <span className="shrink-0">
                <KindBadge kind={kind} />
              </span>
            </ButtonGroupText>
            <Input className="font-mono" value={newKeyName ?? selectedKey} onChange={e => setNewKeyName(e.target.value)} disabled={readOnly} />
            <Button variant="outline" aria-label={t("copy")} title={t("copy")} onClick={copyKeyName}>
              <CopyIcon />
            </Button>
            <Button
              variant="outline"
              aria-label={t("save")}
              title={t("save")}
              className={cn({ "cursor-pointer": !!newKeyName })}
              disabled={!newKeyName || readOnly}
              onClick={() => updateKeyName()}
            >
              <SaveIcon />
            </Button>
          </ButtonGroup>
          <div className="flex shrink-0 items-center gap-2">
            {readOnly ? (
              <div className="relative w-36" title={t("read_only_blocked")}>
                <TimerIcon className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400" size={16} />
                <Input className="pl-9" placeholder="TTL" value={ttlText} disabled />
              </div>
            ) : (
              <KeyTtlUpdateDialog reload={reload} databaseId={connectionId} databaseIdx={databaseIdx} keyName={selectedKey} keyTtl={ttl}>
                <div className="relative w-36 cursor-pointer" title={t("update_ttl")}>
                  <TimerIcon className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400" size={16} />
                  <Input className="cursor-pointer pl-9" placeholder="TTL" value={ttlText} disabled />
                </div>
              </KeyTtlUpdateDialog>
            )}
            <Button size="icon-sm" variant="outline" aria-label={t("refresh")} title={t("refresh")} onClick={reload}>
              <RefreshCcwIcon />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={readOnly}
              aria-label={t("delete")}
              title={readOnly ? t("read_only_blocked") : t("delete")}
              onClick={() => handleDelete(selectedKey)}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 px-0.5 text-xs">
          {lengthValue !== null && <Stat label={t("length")} value={lengthValue.toLocaleString()} />}
          {!!detail?.size && <Stat label={t("memory")} value={formatFileSize(detail.size)} />}
          {!!detail?.encoding && <Stat label={t("encoding")} value={detail.encoding} mono />}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <ViewKeyData
          databaseId={connectionId}
          databaseIdx={databaseIdx}
          kind={kind}
          selectedKey={selectedKey}
          value={displayValue}
          reloadToken={reloadToken}
          loading={loading}
          setLoading={setLoading}
          reload={reload}
          readOnly={readOnly}
        />
      </div>
    </div>
  )
}

// A single labelled metric in the key-detail header strip.
function Stat({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-muted-foreground/70">{label}</span>
      <span className={cn("text-foreground font-medium tabular-nums", mono && "font-mono")}>{value}</span>
    </span>
  )
}

type ViewKeyDataProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  loading: boolean
  setLoading: (value: boolean) => void
  value: any
  kind?: string
  reloadToken: number
  reload: () => void
  readOnly?: boolean
}

function ViewKeyData({ kind, value, databaseId, databaseIdx, selectedKey, reloadToken, reload, readOnly }: ViewKeyDataProps) {
  switch (kind) {
    case "rejson-rl":
      return (
        <KeyDetailJson
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          data={typeof value === "string" ? value : ""}
          reload={reload}
          readOnly={readOnly}
        />
      )
    case "graphdata":
      return <KeyDetailGraph databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} reloadToken={reloadToken} readOnly={readOnly} />
    case "string":
      return <KeyDetailString databaseId={databaseId} databaseIdx={databaseIdx} selectedKey={selectedKey} data={value} reload={reload} readOnly={readOnly} />
    case "json":
      return (
        <CodeEditor
          value={value}
          language="json"
          autoFormat={true}
          defaultHeight={400}
          className="border-0 shadow-none"
          options={{ readOnly: true, minimap: { enabled: false } }}
        />
      )
    case "list":
      return (
        <KeyDetailList
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          reloadToken={reloadToken}
          readOnly={readOnly}
        />
      )
    case "hash":
      return (
        <KeyDetailHash
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          reloadToken={reloadToken}
          readOnly={readOnly}
        />
      )
    case "set":
      return (
        <KeyDetailSet
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          reloadToken={reloadToken}
          readOnly={readOnly}
        />
      )
    case "zset":
      return (
        <KeyDetailZset
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          reloadToken={reloadToken}
          readOnly={readOnly}
        />
      )
    case "stream":
      return (
        <KeyDetailStream
          databaseId={databaseId}
          databaseIdx={databaseIdx}
          selectedKey={selectedKey}
          reload={reload}
          reloadToken={reloadToken}
          readOnly={readOnly}
        />
      )
    default:
      return null
  }
}

type KeyTtlUpdateDialogProps = {
  children: ReactNode
  reload: () => void
  databaseId: string
  databaseIdx: number
  keyName: string
  keyTtl: number
}

function KeyTtlUpdateDialog({ children, reload, databaseId, databaseIdx, keyName, keyTtl }: KeyTtlUpdateDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ttlMutation = useKeyTtlUpdate(databaseId, databaseIdx)

  const form = useForm<any>({
    defaultValues: { ttl: keyTtl },
    resolver: zodResolver(z.object({ ttl: z.number().min(-1) })),
  })

  const submit = form.handleSubmit(async values => {
    try {
      await ttlMutation.mutateAsync({
        connection_id: databaseId,
        database_index: databaseIdx,
        key_name: keyName,
        key_ttl: values.ttl,
      })
      toast.add({ title: t("updated"), type: "success" })
      setOpen(false)
      form.reset()
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  })

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-sm">{t("update_ttl")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="ttl"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">TTL</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button className="cursor-pointer" variant="outline" disabled={form.formState.isSubmitting}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button className="cursor-pointer" type="submit" disabled={form.formState.isSubmitting}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
