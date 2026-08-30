"use client"

import { useState, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { RefreshCcwIcon, Trash2Icon, Loader2Icon } from "lucide-react"
import { Virtuoso } from "react-virtuoso"
import { useKeyDelete, useKeysMetadata } from "@/hooks/api/client.api"
import { useKeysSearch } from "@/hooks/api/keys-search"
import { KeyFilterBar, emptyFilters } from "@/app/_components/key-filter-bar"
import { formatFileSize } from "@/lib/utils"
import { useTabStore } from "@/stores/tab.store"
import type { KeyFilter } from "@/types"

type KeyMetadata = {
  key: string
  type: string
  ttl: number
  size: number
}

export function ConnectionDetailTabKeyList({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const deleteMutation = useKeyDelete(connectionId, databaseIdx)
  const metadataMutation = useKeysMetadata()

  const { addTab } = useTabStore()
  const [metadata, setMetadata] = useState<Record<string, KeyMetadata>>({})
  const [fetchingKeys, setFetchingKeys] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: keyof KeyMetadata; direction: "asc" | "desc" } | null>(null)

  const [filters, setFilters] = useState<KeyFilter[]>(emptyFilters)
  const [matchAll, setMatchAll] = useState(false)
  const [keyType, setKeyType] = useState("")
  const {
    keys,
    isLoading,
    scanned,
    matched,
    error: searchError,
    reload,
    loadMore,
    cancel,
  } = useKeysSearch(connectionId, databaseIdx, { filters, matchAll, keyType })

  const sortedKeys = useMemo(() => {
    const items = [...keys]
    if (sortConfig) {
      items.sort((a, b) => {
        const metaA = metadata[a]
        const metaB = metadata[b]
        if (!metaA || !metaB) return 0
        const valA = metaA[sortConfig.key]
        const valB = metaB[sortConfig.key]
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }
    return items
  }, [keys, metadata, sortConfig])

  const fetchMetadata = useCallback(
    async (keysToFetch: string[]) => {
      if (keysToFetch.length === 0) return
      setFetchingKeys(prev => {
        const next = new Set(prev)
        keysToFetch.forEach(k => next.add(k))
        return next
      })
      try {
        const { items } = await metadataMutation.mutateAsync({
          connection_id: connectionId,
          database_index: databaseIdx,
          keys: keysToFetch,
        })
        setMetadata(prev => {
          const next = { ...prev }
          items?.forEach(m => {
            next[m.key] = m as KeyMetadata
          })
          return next
        })
      } catch (e) {
        console.error("Failed to fetch metadata", e)
      } finally {
        setFetchingKeys(prev => {
          const next = new Set(prev)
          keysToFetch.forEach(k => next.delete(k))
          return next
        })
      }
    },
    [connectionId, databaseIdx, metadataMutation]
  )

  const rangeChanged = useCallback(
    (range: { startIndex: number; endIndex: number }) => {
      const visibleKeys = sortedKeys.slice(range.startIndex, range.endIndex + 1)
      const keysToFetch = visibleKeys.filter(k => !metadata[k] && !fetchingKeys.has(k))
      if (keysToFetch.length > 0) {
        fetchMetadata(keysToFetch)
      }
    },
    [sortedKeys, metadata, fetchingKeys, fetchMetadata]
  )

  const requestSort = (key: keyof KeyMetadata) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const selectKey = (key: string) => {
    addTab({
      type: "key-detail",
      title: key,
      connectionId: connectionId,
      databaseIdx: databaseIdx,
      key: key,
    })
  }

  const reloadKeys = () => {
    setMetadata({})
    reload()
  }

  const deleteKey = (key: string) => {
    deleteMutation.mutate({ connection_id: connectionId, database_index: databaseIdx, key })
  }

  const formatTtl = (ttlNs: number) => {
    if (ttlNs < 0) return "PERSIST"
    const ms = Math.floor(ttlNs / 1000000)
    if (ms < 1000) return `${ms}ms`
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    return `${h}h`
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative text-sm">
      <div className="p-2 border-b bg-muted/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{t("keys")}</h2>
          <Badge variant="secondary" className="font-normal text-[10px] h-5 opacity-70">
            {keys.length} Total
          </Badge>
        </div>
        <div className="flex items-start gap-2">
          <KeyFilterBar
            className="w-96"
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
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={reloadKeys} disabled={isLoading}>
            {isLoading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <RefreshCcwIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col p-2">
        <div className="rounded-lg border bg-card flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-muted/30 grid grid-cols-12 font-medium text-xs uppercase tracking-wider py-2 shrink-0">
            <div className="col-span-5 px-4 cursor-pointer flex items-center gap-1" onClick={() => requestSort("key")}>
              {t("name")}
              {sortConfig?.key === "key" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2 px-4 cursor-pointer flex items-center gap-1" onClick={() => requestSort("type")}>
              {t("type")}
              {sortConfig?.key === "type" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2 px-4 cursor-pointer flex items-center gap-1" onClick={() => requestSort("ttl")}>
              {t("ttl")}
              {sortConfig?.key === "ttl" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-2 px-4 cursor-pointer flex items-center gap-1 justify-end" onClick={() => requestSort("size")}>
              {t("size")}
              {sortConfig?.key === "size" && (sortConfig.direction === "asc" ? "↑" : "↓")}
            </div>
            <div className="col-span-1 px-4 text-right"></div>
          </div>
          <div className="flex-1 min-h-0">
            <Virtuoso
              data={sortedKeys}
              rangeChanged={rangeChanged}
              endReached={loadMore}
              itemContent={(_index, key) => {
                const meta = metadata[key]
                return (
                  <div className="grid grid-cols-12 border-b last:border-0 hover:bg-muted/50 cursor-pointer group py-2" onClick={() => selectKey(key)}>
                    <div className="col-span-5 px-4 truncate font-medium">{key}</div>
                    <div className="col-span-2 px-4">
                      {meta ? (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 font-normal uppercase bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {meta.type}
                        </Badge>
                      ) : (
                        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                      )}
                    </div>
                    <div className="col-span-2 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{meta ? formatTtl(meta.ttl) : "-"}</div>
                    <div className="col-span-2 px-4 text-right font-mono text-xs text-muted-foreground">{meta ? formatFileSize(meta.size) : "-"}</div>
                    <div className="col-span-1 px-4 text-right flex justify-end">
                      <div
                        className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-opacity"
                        onClick={e => {
                          e.stopPropagation()
                          deleteKey(key)
                        }}
                      >
                        <Trash2Icon className="h-3 w-3 text-red-500" />
                      </div>
                    </div>
                  </div>
                )
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
