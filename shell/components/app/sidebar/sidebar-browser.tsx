"use client"

import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, toast } from "@tradalab/lyra/ui"
import { SidebarPanel } from "@tradalab/lyra/shell"
import {
  ArrowDownToLineIcon,
  ListEndIcon,
  MoreHorizontal,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
  TerminalIcon,
  ActivityIcon,
  ChartColumnIcon,
  DatabaseIcon,
  RadioIcon,
  LayoutGridIcon,
  MonitorIcon,
  LockIcon,
  PanelsTopLeftIcon,
} from "lucide-react"
import { flattenTree, sortTree, TreeItem, FlattenedTreeItem } from "@/components/app/tree"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAppContext } from "@/ctx/app.context"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeTrigger, TreeProvider, TreeView } from "@tradalab/lyra/blocks"
import { Virtuoso } from "react-virtuoso"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@tradalab/lyra/ui"
import { BrowserAddKeyDialog } from "@/components/app/browser-add-key-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { DbInfo } from "@/types"
import { client, connection } from "@/api"
import { useKeyDelete, useKeysDeleteByPrefix } from "@/hooks/api/client.api"
import { useKeysSearch } from "@/hooks/api/keys-search"
import { KeyFilterBar, emptyFilters } from "@/components/app/key-filter-bar"
import type { KeyFilter } from "@/types"
import { useConnectionList, useSetReadOnly } from "@/hooks/api/connection.api"
import { Badge } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Spinner } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { useConfirm } from "@tradalab/lyra/blocks"
import { useTabStore } from "@/stores/tab.store"
import { BrowserBulkDeleteDialog } from "@/components/app/browser-bulk-delete-dialog"

export function SidebarBrowser() {
  const { t } = useTranslation()
  const [dataset, setDataset] = useState<TreeItem[]>([])
  const [filters, setFilters] = useState<KeyFilter[]>(emptyFilters)
  const [matchAll, setMatchAll] = useState(false)
  const [keyType, setKeyType] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dbs, setDbs] = useState<DbInfo[]>([])
  const confirm = useConfirm()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePrefix, setDeletePrefix] = useState("")

  const { connect, selectedDb, setSelectedDbIdx, selectedDbIdx } = useAppContext()
  const { addTab } = useTabStore()
  const { data: connectionList = [] } = useConnectionList()
  const currentConnection = connectionList.find(c => c.id === selectedDb)
  const readOnly = Boolean(currentConnection?.read_only)
  const setReadOnly = useSetReadOnly()

  const toggleReadOnly = async () => {
    if (!selectedDb || setReadOnly.isPending) return
    try {
      await setReadOnly.mutateAsync({ connectionId: selectedDb, databaseIdx: selectedDbIdx, readOnly: !readOnly })
      toast.add({ title: !readOnly ? t("read_only_enabled") : t("read_only_disabled"), type: "success" })
    } catch (e: any) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }

  const {
    keys,
    isLoading,
    hasMore,
    scanned,
    matched,
    error: searchError,
    reload,
    loadMore,
    loadAll,
    cancel,
  } = useKeysSearch(selectedDb || "", selectedDbIdx, { filters, matchAll, keyType, limit: currentConnection?.key_size || undefined })

  const deleteMutation = useKeyDelete(selectedDb || "", selectedDbIdx)
  const deleteByPrefixMutation = useKeysDeleteByPrefix(selectedDb || "", selectedDbIdx)

  const deleteKey = async (key: string) => {
    try {
      await deleteMutation.mutateAsync({ connection_id: selectedDb || "", database_index: selectedDbIdx, key })
      toast.add({ title: t("deleted"), type: "success" })
    } catch (e: any) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
    }
  }
  const deleteByPrefix = async (prefix: string, keys?: string[]) => {
    const toastId = toast.add({ title: t("deleting"), type: "loading" })
    try {
      await deleteByPrefixMutation.mutateAsync({
        prefix,
        keys,
        onProgress: data => {
          toast.add({ title: `${t("deleting")} (${data.deleted})`, id: toastId, type: "loading" })
        },
      })
      toast.add({ title: t("deleted"), id: toastId, type: "success" })
    } catch (e: any) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), id: toastId, type: "error" })
    }
  }
  const scanByPrefix = async (prefix: string, _cursor: string = "0", _limit: number = 1000) => {
    try {
      const res = await client.keysScanByPrefix({
        connection_id: selectedDb || "",
        database_index: selectedDbIdx,
        prefix,
        keys: [],
      })
      return { keys: res.keys || [], nextCursor: res.next_cursor }
    } catch (e: any) {
      toast.add({ title: e instanceof Error ? e.message : t("unknown_error"), type: "error" })
      return { keys: [], nextCursor: "0" }
    }
  }

  const [isBuildingTree, setIsBuildingTree] = useState(false)
  const userHasScrolled = useRef(false)

  useEffect(() => {
    loadInfo()
  }, [selectedDb, selectedDbIdx])

  useEffect(() => {
    if (keys.length === 0) {
      setDataset([])
      return
    }
    setIsBuildingTree(true)
    const timer = setTimeout(() => {
      setDataset(sortTree(buildTree(keys)))
      setIsBuildingTree(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [keys])

  const handleDelete = async (item: TreeItem) => {
    if (isLoading) return

    const isGroup = item.isGroup
    const prefix = isGroup ? item.id.replace("group__", "") + ":" : item.id

    if (isGroup) {
      setDeletePrefix(prefix)
      setDeleteDialogOpen(true)
      return
    }

    const ok = await confirm({
      title: t("confirm_delete"),
      description: t("confirm_delete_desc", { obj_name: "key", obj_key: item.id }),
      confirmText: t("delete"),
      danger: true,
    })

    if (ok) {
      await deleteKey(item.id)
    }
  }

  const buildTree = (keys: string[], delimiter = ":"): TreeItem[] => {
    const root: TreeItem[] = []
    const cache = new Map<string, TreeItem>()

    for (const key of keys) {
      const parts = key.split(delimiter)
      let currentLevel = root
      let currentPath = ""

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1
        const path = currentPath ? currentPath + delimiter + part : part
        currentPath = path
        const id = isLast ? path : "group__" + path

        let node = cache.get(id)

        if (!node) {
          node = {
            id,
            name: part,
            isLeaf: isLast,
            isGroup: !isLast,
            level: index,
            children: [],
            keyCount: 0,
          }
          cache.set(id, node)
          currentLevel.push(node)
        }

        if (!isLast) {
          node.keyCount = (node.keyCount || 0) + 1
          currentLevel = node.children!
        }
      })
    }
    return root
  }

  const loadInfo = async () => {
    if (!selectedDb) {
      return
    }
    try {
      const res = await client.general({ connection_id: selectedDb, database_index: selectedDbIdx })
      setDbs((res.databases || []) as DbInfo[])
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }

  const flattenedData = useMemo(() => {
    return flattenTree(dataset, expandedIds)
  }, [dataset, expandedIds])

  const onChangeDbIdx = async (idx: number) => {
    try {
      const res = await connection.list({})
      const conn = (res.items || []).find(c => c.id === selectedDb)
      if (!conn) {
        toast.add({ title: t("conn_not_exist"), type: "error" })
        return
      }
      await connect(conn, idx)
      setSelectedDbIdx(idx)
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }

  if (!selectedDb) {
    setDataset([])
    return null
  }

  return (
    <SidebarPanel variant="sidebar" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
      <SidebarHeader className="gap-2 border-b" style={{ padding: "var(--sidebar-header-p)" }}>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="text-foreground text-sm font-semibold truncate" title={currentConnection?.name || t("browser")}>
              {currentConnection?.name || t("browser")}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="flex size-1.5 rounded-full bg-green-500" />
              DB{selectedDbIdx}
              {readOnly && (
                <button type="button" onClick={toggleReadOnly} title={t("read_only_disable")} className="inline-flex">
                  <Badge
                    variant="outline"
                    className="ml-1 h-3.5 gap-0.5 rounded-sm px-1 py-0 text-[8px] leading-none font-semibold uppercase tracking-wide border-amber-500/50 text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20 [&>svg]:size-2!"
                  >
                    <LockIcon />
                    {t("read_only")}
                  </Badge>
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="inline-flex items-center cursor-pointer focus:outline-none" title={t("views")}>
                  <PanelsTopLeftIcon className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "key-list",
                      title: t("key_list") + ` (DB ${selectedDbIdx})`,
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <LayoutGridIcon className="h-4 w-4" />
                  {t("key_list")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "general",
                      title: currentConnection?.name || "General",
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <DatabaseIcon className="h-4 w-4" />
                  {t("general")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "console",
                      title: "Console",
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <TerminalIcon className="h-4 w-4" />
                  {t("console")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({ type: "pubsub", title: "Pub/Sub", connectionId: selectedDb!, connectionName: currentConnection?.name, databaseIdx: selectedDbIdx })
                  }
                >
                  <RadioIcon className="h-4 w-4" />
                  Pub/Sub
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "monitor",
                      title: "Monitor",
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <MonitorIcon className="h-4 w-4" />
                  {t("monitor")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "analysis",
                      title: "Analysis",
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <ChartColumnIcon className="h-4 w-4" />
                  {t("analysis")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() =>
                    addTab({
                      type: "slow-query",
                      title: "Slow Query",
                      connectionId: selectedDb!,
                      connectionName: currentConnection?.name,
                      databaseIdx: selectedDbIdx,
                    })
                  }
                >
                  <ActivityIcon className="h-4 w-4" />
                  {t("slow_query")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={readOnly} onCheckedChange={() => toggleReadOnly()} className="gap-2 cursor-pointer">
                  <LockIcon className="h-4 w-4" />
                  {t("read_only")}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <RefreshCcwIcon
              className="h-4 w-4 cursor-pointer"
              onClick={() => {
                if (isLoading) {
                  return
                }
                loadInfo()
                reload()
              }}
            />
            {readOnly ? (
              <span title={t("read_only_blocked")} className="inline-flex">
                <PlusIcon className="h-4 w-4 cursor-not-allowed opacity-40" />
              </span>
            ) : (
              <BrowserAddKeyDialog>
                <PlusIcon className="h-4 w-4 cursor-pointer" />
              </BrowserAddKeyDialog>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedDbIdx.toString()} onValueChange={val => onChangeDbIdx(Number(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("select_db")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {dbs.map((db: DbInfo) => (
                  <SelectItem key={db.index} value={db.index?.toString()}>
                    {db.name} {selectedDbIdx == db.index ? `(${keys.length}/${db.keys})` : `(${db.keys})`}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button size="icon-sm" variant="outline" title={"load_more"} disabled={isLoading || !hasMore} onClick={loadMore}>
            {isLoading ? <Spinner /> : <ArrowDownToLineIcon />}
          </Button>
          <Button size="icon-sm" variant="outline" title={"load_all"} disabled={isLoading || !hasMore} onClick={loadAll}>
            {isLoading ? <Spinner /> : <ListEndIcon />}
          </Button>
        </div>
        <KeyFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          matchAll={matchAll}
          onMatchAllChange={setMatchAll}
          keyType={keyType}
          onKeyTypeChange={setKeyType}
          isLoading={isLoading}
          scanned={scanned}
          matched={matched}
          error={searchError}
          onStop={cancel}
        />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden! p-0 flex flex-col h-full">
        <SidebarGroup className="p-0 flex-1 min-h-0 flex flex-col">
          <SidebarGroupContent className="flex-1 min-h-0 flex flex-col">
            <SidebarMenu className="flex-1 min-h-0 flex flex-col">
              <TreeProvider
                className="flex flex-col flex-1 min-h-0"
                expandedIds={expandedIds}
                onExpandedChange={setExpandedIds}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                multiSelect
              >
                <TreeView className="p-0 flex flex-col flex-1 min-h-0 relative h-full">
                  {isBuildingTree && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                      <Spinner className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  {flattenedData.length === 0 && keys.length > 0 && !isBuildingTree && (
                    <div className="p-4 text-xs text-muted-foreground text-center">{t("no_keys_match")}</div>
                  )}
                  <div className="absolute inset-0">
                    <Virtuoso
                      className="h-full w-full"
                      data={flattenedData}
                      onScroll={() => {
                        userHasScrolled.current = true
                      }}
                      endReached={() => {
                        if (!userHasScrolled.current) return
                        loadMore()
                      }}
                      itemContent={(index, item) => (
                        <RenderTreeItem key={item.id} item={item} deleteKey={handleDelete} connectionName={currentConnection?.name} readOnly={readOnly} />
                      )}
                    />
                  </div>
                </TreeView>
              </TreeProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <BrowserBulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        prefix={deletePrefix}
        onScan={scanByPrefix}
        onConfirm={keys => deleteByPrefix(deletePrefix, keys)}
      />
    </SidebarPanel>
  )
}

function RenderTreeItem({
  item,
  deleteKey,
  connectionName,
  readOnly,
}: {
  item: FlattenedTreeItem
  deleteKey: (item: TreeItem) => Promise<void>
  connectionName?: string
  readOnly?: boolean
}) {
  const { selectedDb, selectedDbIdx } = useAppContext()
  const { addTab } = useTabStore()

  const selectKey = () => {
    addTab({
      type: "key-detail",
      title: item.id,
      connectionId: selectedDb!,
      connectionName: connectionName,
      databaseIdx: selectedDbIdx,
      key: item.id,
    })
  }

  return (
    <TreeNode nodeId={item.id} isLast={item.isLast} level={item.depth} parentPath={item.parentPath}>
      <TreeNodeTrigger className="cursor-default px-1 py-1.5 group/item" expandOnClick={item.isGroup} onClick={item.isGroup ? undefined : selectKey}>
        <TreeExpander hasChildren={item.isGroup} />
        <TreeIcon hasChildren={item.isGroup} />
        <TreeLabel title={item.name}>
          {item.name || "[Empty]"} {item.isGroup && item.keyCount !== undefined && item.keyCount > 0 && `(${item.keyCount})`}
        </TreeLabel>
        {!readOnly && <ActionButton item={item} deleteKey={deleteKey} />}
      </TreeNodeTrigger>
    </TreeNode>
  )
}

const ActionButton = ({ item, deleteKey }: { item: TreeItem; deleteKey: (item: TreeItem) => Promise<void> }) => {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="min-w-56 rounded-lg">
        <DropdownMenuItem
          className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          onClick={async e => {
            e.stopPropagation()
            await deleteKey(item)
          }}
        >
          <Trash2Icon className="h-4 w-4 text-red-600" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
