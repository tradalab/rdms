"use client"

import { useMemo, useState, memo } from "react"
import { useTranslation } from "react-i18next"

import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInput, SidebarMenu, toast } from "@tradalab/lyra/ui"
import { SidebarPanel } from "@tradalab/lyra/shell"
import { EditIcon, FolderPlusIcon, LockIcon, MoreHorizontal, PlugIcon, PlusIcon, RefreshCcwIcon, Trash2Icon, UnplugIcon } from "lucide-react"
import { TreeExpander, TreeIcon, TreeLabel, TreeNode, TreeNodeContent, TreeNodeTrigger, TreeProvider, TreeView } from "@tradalab/lyra/blocks"
import { filterTree, sortTree, TreeItem } from "@/app/_components/tree"
import { buildDbTree, cn } from "@/lib/utils"
import { useAppContext } from "@/ctx/app.context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@tradalab/lyra/ui"
import { useConfirm } from "@tradalab/lyra/blocks"
import { useConnection } from "@/app/_components/connection/connection.context"
import { ConnectionReq as ConnectionDO, GroupItem as GroupDO } from "@/types"
import { useDeleteGroup, useGroupList } from "@/hooks/api/group.api"
import { useConnectionList, useDeleteConnection } from "@/hooks/api/connection.api"
import { useGroup } from "@/app/_components/group/group.context"

export function SidebarConnection() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { create: connectionCreate } = useConnection()
  const { create: groupCreate } = useGroup()

  const { data: groups = [], refetch: groupsRefetch } = useGroupList()
  const { data: databases = [], refetch: databasesRefetch } = useConnectionList()

  const dataset = useMemo(() => sortTree(buildDbTree(groups, databases)), [groups, databases])

  const filteredDataset = useMemo(() => filterTree(dataset, keyword), [dataset, keyword])

  const refetch = () => {
    groupsRefetch()
    databasesRefetch()
  }

  return (
    <>
      <SidebarPanel variant="sidebar" className="flex flex-1 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-2px)]!">
        <SidebarHeader className="gap-2 border-b p-2">
          <div className="flex items-center justify-between">
            <div className="text-base font-medium">{t("connections")}</div>
            <div className="flex gap-2">
              <RefreshCcwIcon className="h-4 w-4 cursor-pointer" onClick={refetch} />
              <FolderPlusIcon className="h-4 w-4 cursor-pointer" onClick={groupCreate} />
              <PlusIcon className="h-4 w-4 cursor-pointer" onClick={connectionCreate} />
            </div>
          </div>
          <SidebarInput placeholder={t("filter")} onChange={e => setKeyword(e.target.value)} />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <TreeProvider defaultExpandedIds={[]} selectedIds={selectedIds} onSelectionChange={setSelectedIds} multiSelect>
                  <TreeView className="px-1 py-2">
                    {filteredDataset.map((item: TreeItem) => (
                      <RenderTreeItem key={item.id} item={item} reload={refetch} />
                    ))}
                  </TreeView>
                </TreeProvider>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </SidebarPanel>
    </>
  )
}

type RenderTreeItemProps = {
  item: TreeItem
  reload: () => void
}

function RenderTreeItem({ item, reload }: RenderTreeItemProps) {
  const { t } = useTranslation()
  const { connect, selectedDb } = useAppContext()
  const isActive = !item.isGroup && item.id === selectedDb
  const readOnly = !item.isGroup && Boolean(item.connection?.read_only)

  return (
    <TreeNode
      nodeId={item.id}
      level={item.level}
      isLast={item.level === 0}
      onDoubleClick={
        !item.isGroup
          ? async e => {
              e.stopPropagation()
              if (item.connection) {
                await connect(item.connection, item.connection.last_db || 0)
              }
            }
          : undefined
      }
    >
      <TreeNodeTrigger className={cn("group/item px-1 py-1.5", isActive && "bg-accent text-accent-foreground font-medium rounded-md")}>
        <TreeExpander hasChildren={item.isGroup} />
        <TreeIcon hasChildren={item.isGroup} />
        <TreeLabel>{item.name}</TreeLabel>
        {readOnly && (
          <span title={t("read_only")} className="ml-auto mr-0.5 inline-flex shrink-0">
            <LockIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </span>
        )}
        <ActionButton item={item} reload={reload} />
      </TreeNodeTrigger>

      {item.isGroup && item.children && (
        <TreeNodeContent hasChildren>
          {item.children.map((child: TreeItem) => (
            <RenderTreeItem key={child.id} item={child} reload={reload} />
          ))}
        </TreeNodeContent>
      )}
    </TreeNode>
  )
}

type ActionButtonProps = {
  item: TreeItem
  reload: () => void
}

const ActionButton = memo(function ActionButton({ item, reload }: ActionButtonProps) {
  const { t } = useTranslation()
  const { connect, disconnect } = useAppContext()
  const confirm = useConfirm()
  const { edit: connectionEdit } = useConnection()
  const { edit: groupEdit } = useGroup()
  const deleteConnection = useDeleteConnection()
  const deleteGroup = useDeleteGroup()

  const deleteItem = async () => {
    try {
      const ok = await confirm({
        title: t("confirm_delete"),
        description: t("confirm_delete_desc", { obj_name: item.isGroup ? "group" : "connection", obj_key: item.name }),
        confirmText: t("delete"),
        danger: true,
      })
      if (!ok) {
        return
      }
      if (item.isGroup) {
        await deleteGroup.mutateAsync(item.id)
      } else {
        await deleteConnection.mutateAsync(item.id)
      }
      toast.add({ title: "Deleted!", type: "success" })
      reload()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer ml-1 opacity-0 group-hover/item:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        {!item.isGroup && item.connection && (
          <>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                connect(item.connection, item.connection?.last_db || 0)
              }}
            >
              <PlugIcon className="h-4 w-4" />
              {t("connect")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                disconnect(item.connection)
              }}
            >
              <UnplugIcon className="h-4 w-4" />
              {t("disconnect")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                connectionEdit(item.connection as ConnectionDO)
              }}
            >
              <EditIcon className="h-4 w-4" />
              {t("update")}
            </DropdownMenuItem>
          </>
        )}
        {item.isGroup && item.group && (
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation()
              groupEdit(item.group as GroupDO)
            }}
          >
            <EditIcon className="h-4 w-4" />
            {t("update")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-red-600"
          onClick={e => {
            e.stopPropagation()
            deleteItem()
          }}
        >
          <Trash2Icon className="h-4 w-4" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
