"use client"

import { DataTable } from "@tradalab/lyra/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { HashType } from "@/types/hash.type"
import { useKeyValuePage } from "@/hooks/use-key-value-page"
import { Button, toast } from "@tradalab/lyra/ui"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@tradalab/lyra/ui"
import { KeyAddValueHash } from "@/app/_components/key-add/key-add-value-hash"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form } from "@tradalab/lyra/blocks"
import { Spinner } from "@tradalab/lyra/ui"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { useState } from "react"
import { useKeyCreate } from "@/hooks/api/client.api"
import { useHashFieldDel } from "@/hooks/api/key.api"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { useConfirm } from "@tradalab/lyra/blocks"
import { CellText } from "@/app/_components/key-detail/key-detail-shared"
import { KeyEditDrawer } from "@/app/_components/key-detail/key-edit-drawer"

type KeyDetailHashProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  reloadToken: number
  reload: () => void
  readOnly?: boolean
}

export function KeyDetailHash(props: KeyDetailHashProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<boolean>(false)
  const [deletingField, setDeletingField] = useState<string | null>(null)
  const [editing, setEditing] = useState<HashType | null>(null)
  const confirm = useConfirm()
  const { items, isLoading, isFetchingNextPage, hasMore, fetchNextPage } = useKeyValuePage(
    props.databaseId,
    props.databaseIdx,
    props.selectedKey,
    "hash",
    props.reloadToken
  )
  const createMutation = useKeyCreate(props.databaseId, props.databaseIdx)
  const delMutation = useHashFieldDel(props.databaseId, props.databaseIdx)

  const columns: ColumnDef<HashType>[] = [
    {
      accessorKey: "id",
      header: "#",
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.original.id + 1}</span>,
    },
    {
      accessorKey: "key",
      header: "Key",
      cell: ({ row }) => <CellText>{row.original.key}</CellText>,
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
        const fieldKey = row.original.key
        const isDeleting = deletingField === fieldKey

        return (
          <div className="flex justify-end gap-1">
            <span
              role="button"
              onClick={() => setEditing(row.original)}
              className="inline-flex h-5 w-5 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="h-4 w-4" />
            </span>
            <span
              role="button"
              aria-disabled={isDeleting}
              onClick={async () => {
                if (isDeleting) return
                const ok = await confirm({
                  title: t("confirm_delete"),
                  description: t("confirm_delete_desc", { obj_name: "field", obj_key: fieldKey }),
                  confirmText: t("delete"),
                  danger: true,
                })
                if (ok) {
                  await fieldDel(fieldKey)
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
    defaultValues: {
      value_hash: [{ key: "", value: "" }],
    },
    resolver: zodResolver(
      z.object({
        value_hash: z.any().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    setLoading(true)
    try {
      await createMutation.mutateAsync({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        kind: KeyKindEnum.HASH,
        ttl: -1,
        value_string: "",
        value_json: "",
        value_graph: "",
        value_hash: values.value_hash,
        value_stream: { id: "", values: "" },
      })
      toast.add({ title: t("updated"), type: "success" })
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  })

  const fieldDel = async (field: string) => {
    if (deletingField) return
    setDeletingField(field)
    try {
      await delMutation.mutateAsync({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        field: field,
      })
      toast.add({ title: t("deleted"), type: "success" })
      props.reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    } finally {
      setDeletingField(null)
    }
  }

  return (
    <>
      <div>
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
                    <KeyAddValueHash form={form} />
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
      </div>
      <DataTable
        columns={columns}
        data={items as HashType[]}
        className="border-0"
        loading={isLoading}
        loadingText={t("loading")}
        emptyText={t("no_items")}
        onLoadMore={fetchNextPage}
        hasMore={hasMore}
        loadingMore={isFetchingNextPage}
        loadingMoreText={t("loading")}
      />
      <KeyEditDrawer
        connectionId={props.databaseId}
        databaseIdx={props.databaseIdx}
        keyName={props.selectedKey}
        item={editing ? { kind: "hash", field: editing.key, value: editing.value } : null}
        onOpenChange={o => {
          if (!o) setEditing(null)
        }}
        onSaved={props.reload}
      />
    </>
  )
}
