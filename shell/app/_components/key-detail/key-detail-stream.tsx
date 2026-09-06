"use client"

import { useState } from "react"
import { useKeyValuePage } from "@/hooks/use-key-value-page"
import { DataTable } from "@tradalab/lyra/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { StreamType } from "@/types/stream.type"
import { useKeyCreate } from "@/hooks/api/client.api"
import { useStreamEntryDel } from "@/hooks/api/key.api"
import { cn } from "@/lib/utils"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@tradalab/lyra/blocks"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger, toast } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Form } from "@tradalab/lyra/blocks"
import { Spinner } from "@tradalab/lyra/ui"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { KeyAddValueStream } from "@/app/_components/key-add/key-add-value-stream"
import { CellText } from "@/app/_components/key-detail/key-detail-shared"

type Props = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  reloadToken: number
  reload: () => void
  readOnly?: boolean
}

const schema = z.object({
  value_stream: z.any().optional(),
})

export function KeyDetailStream(props: Props) {
  const { t } = useTranslation()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null)
  const { items, isLoading, isFetchingNextPage, hasMore, fetchNextPage } = useKeyValuePage(
    props.databaseId,
    props.databaseIdx,
    props.selectedKey,
    "stream",
    props.reloadToken
  )
  const createMutation = useKeyCreate(props.databaseId, props.databaseIdx)
  const delMutation = useStreamEntryDel(props.databaseId, props.databaseIdx)

  const columns: ColumnDef<StreamType>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <CellText className="text-muted-foreground">{row.original.id}</CellText>,
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => <CellText>{row.original.value}</CellText>,
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => {
        if (props.readOnly) return null
        const entryId = row.original.id
        const isDeleting = deletingEntry === entryId

        return (
          <div className="flex justify-end">
            <span
              role="button"
              aria-disabled={isDeleting}
              onClick={async () => {
                if (isDeleting) return
                const ok = await confirm({
                  title: t("confirm_delete"),
                  description: t("confirm_delete_desc", { obj_name: "entry", obj_key: entryId }),
                  confirmText: t("delete"),
                  danger: true,
                })
                if (ok) {
                  await entryDel(entryId)
                }
              }}
              className={cn(
                "inline-flex items-center justify-center",
                "h-5 w-5 cursor-pointer",
                "text-red-600 hover:text-red-700",
                isDeleting && "cursor-not-allowed opacity-50"
              )}
            >
              {isDeleting ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              ) : (
                <Trash2Icon className="h-4 w-4" />
              )}
            </span>
          </div>
        )
      },
    },
  ]

  const form = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: {
      value_stream: {},
    },
  })

  const submit = form.handleSubmit(async values => {
    setLoading(true)
    try {
      const entries = Object.fromEntries((values.value_stream ?? []).filter((i: any) => i?.field !== "").map((i: any) => [i?.field, i?.value]))
      await createMutation.mutateAsync({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        kind: KeyKindEnum.STREAM,
        ttl: -1,
        value_string: "",
        value_json: "",
        value_graph: "",
        value_stream: {
          id: "*",
          values: JSON.stringify(entries),
        },
      })

      toast.add({ title: t("saved"), type: "success" })
      form.reset({ value_stream: {} })
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  })

  const entryDel = async (id: string) => {
    if (deletingEntry) return
    setDeletingEntry(id)
    try {
      await delMutation.mutateAsync({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        entry_id: id,
      })
      toast.add({ title: t("deleted"), type: "success" })
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    } finally {
      setDeletingEntry(null)
    }
  }

  return (
    <>
      {props.readOnly ? (
        <Button size="sm" variant="outline" className="mb-2" disabled title={t("read_only_blocked")}>
          <PlusIcon />
          {t("insert_row")}
        </Button>
      ) : (
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <Button size="sm" variant="outline" className="mb-2">
              <PlusIcon />
              {t("insert_row")}
            </Button>
          </DrawerTrigger>
          <DrawerContent className="sm:max-w-lg">
            <Form {...form}>
              <form onSubmit={submit} className="flex h-full flex-col">
                <DrawerHeader>
                  <DrawerTitle>{t("new_field")}</DrawerTitle>
                  <DrawerDescription>{t("insert_row_desc")}</DrawerDescription>
                </DrawerHeader>
                {/* Editor owns its own FormFields; this is just a scroll region. */}
                <div className="min-h-0 flex-1 overflow-y-auto px-4">
                  <KeyAddValueStream form={form} />
                </div>
                <DrawerFooter className="flex-row justify-end">
                  <DrawerClose asChild>
                    <Button size="sm" variant="outline" type="button">
                      {t("cancel")}
                    </Button>
                  </DrawerClose>
                  <Button size="sm" type="submit" disabled={loading}>
                    {loading && <Spinner />}
                    {t("save")}
                  </Button>
                </DrawerFooter>
              </form>
            </Form>
          </DrawerContent>
        </Drawer>
      )}

      <DataTable
        columns={columns}
        data={items as StreamType[]}
        className="border-0"
        loading={isLoading}
        loadingText={t("loading")}
        emptyText={t("no_items")}
        onLoadMore={fetchNextPage}
        hasMore={hasMore}
        loadingMore={isFetchingNextPage}
        loadingMoreText={t("loading")}
      />
    </>
  )
}
