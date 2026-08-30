import { GroupItem as GroupDO, ConnectionReq as ConnectionDO } from "@/types"

export type TreeItem = {
  id: string
  name: string
  level?: number
  isGroup?: boolean
  isLeaf?: boolean
  group?: GroupDO
  connection?: ConnectionDO
  children?: TreeItem[]
  keyCount?: number
}

export type FlattenedTreeItem = TreeItem & {
  depth: number
  parentId?: string
  parentPath: boolean[]
  isVisible: boolean
  isExpanded: boolean
  hasChildren: boolean
  isLast: boolean
}

export function filterTree(items: TreeItem[], keyword: string): TreeItem[] {
  if (!keyword) return items

  const lower = keyword.toLowerCase()
  return items
    .map<TreeItem | null>((item: TreeItem) => {
      const nameMatch = item.name.toLowerCase().includes(lower)
      const filteredChildren: TreeItem[] | undefined = item.children ? filterTree(item.children, keyword) : undefined
      if (nameMatch || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...item,
          children: nameMatch ? item.children : filteredChildren,
        }
      }
      return null
    })
    .filter((x): x is TreeItem => x !== null)
}

export function sortTree(items: TreeItem[]): TreeItem[] {
  items.sort((a, b) => {
    if (a.isGroup && !b.isGroup) return -1
    if (!a.isGroup && b.isGroup) return 1

    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })

  for (let i = 0; i < items.length; i++) {
    if (items[i].children && items[i].children!.length > 0) {
      sortTree(items[i].children!)
    }
  }

  return items
}

export function flattenTree(
  items: TreeItem[],
  expandedIds: Set<string>,
  depth = 0,
  parentId?: string,
  parentPath: boolean[] = [],
  result: FlattenedTreeItem[] = []
): FlattenedTreeItem[] {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isLast = i === items.length - 1
    const hasChildren = !!(item.children && item.children.length > 0)
    const isExpanded = expandedIds.has(item.id)

    result.push({
      ...item,
      depth,
      parentId,
      parentPath,
      isVisible: true,
      isExpanded,
      hasChildren,
      isLast,
    } as FlattenedTreeItem)

    if (item.isGroup && isExpanded && item.children) {
      flattenTree(item.children, expandedIds, depth + 1, item.id, [...parentPath, isLast], result)
    }
  }
  return result
}
