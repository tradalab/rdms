"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { NetworkIcon, PlayIcon, TableIcon } from "lucide-react"
import { Badge, Button, Kbd, Spinner, ToggleGroup, ToggleGroupItem } from "@tradalab/lyra/ui"
import { DataTable } from "@tradalab/lyra/data-table"
import { useTranslation } from "react-i18next"
import { CodeEditor } from "@/app/_components/code-editor"
import { CellText } from "@/app/_components/key-detail/key-detail-shared"
import { GraphCanvas } from "@/app/_components/key-detail/graph-canvas"
import { useGraphQuery, useGraphSchema } from "@/hooks/api/graph.api"
import { registerCypher, setCypherSchema } from "@/lib/cypher"

const DEFAULT_QUERY = "MATCH (n)-[r]->(m)\nRETURN n, r, m\nLIMIT 25"

export type KeyDetailGraphProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  reloadToken: number
  readOnly?: boolean
}

type Row = Record<string, string>

export function KeyDetailGraph(props: KeyDetailGraphProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [view, setView] = useState<"graph" | "table">("graph")

  const schema = useGraphSchema(props.databaseId, props.databaseIdx, props.selectedKey)
  const run = useGraphQuery(props.databaseId, props.databaseIdx, props.selectedKey)

  const { mutate } = run
  const execute = useCallback(
    (text: string) => {
      if (!text.trim()) return
      mutate(text)
    },
    [mutate]
  )

  // Every dep is load-bearing: this component keeps its place in the tree when
  // the database changes, and reloadToken is the refresh button's only route in.
  useEffect(() => {
    execute(DEFAULT_QUERY)
    setQuery(DEFAULT_QUERY)
  }, [props.selectedKey, props.databaseId, props.databaseIdx, props.reloadToken, execute])

  useEffect(() => {
    setCypherSchema(schema.data ?? {})
  }, [schema.data])

  const result = run.data
  const nodes = useMemo(() => result?.nodes ?? [], [result])
  const edges = useMemo(() => result?.edges ?? [], [result])

  const tableColumns: ColumnDef<Row>[] = useMemo(
    () =>
      (result?.columns ?? []).map((name, i) => ({
        id: `c${i}`,
        accessorKey: `c${i}`,
        header: name,
        cell: ({ row }) => <CellText className="line-clamp-3">{row.original[`c${i}`]}</CellText>,
      })),
    [result]
  )

  const tableRows: Row[] = useMemo(
    () =>
      (result?.rows ?? []).map(r => {
        const out: Row = {}
        ;(r.cells ?? []).forEach((cell, i) => {
          out[`c${i}`] = cell
        })
        return out
      }),
    [result]
  )

  const error = run.error?.message
  const stats = result?.stats ?? []

  return (
    <div className="flex h-full min-h-[440px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => execute(query)}>
          {run.isPending ? <Spinner /> : <PlayIcon />}
          {t("run")}
        </Button>
        <Kbd className="text-muted-foreground">Ctrl+Enter</Kbd>

        {props.readOnly && (
          <Badge variant="secondary" title={t("graph_read_only_hint")}>
            {t("read_only")}
          </Badge>
        )}

        <div className="text-muted-foreground ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            {t("graph_nodes")} <span className="text-foreground font-medium tabular-nums">{(schema.data?.nodes ?? 0).toLocaleString()}</span>
          </span>
          <span>
            {t("graph_edges")} <span className="text-foreground font-medium tabular-nums">{(schema.data?.edges ?? 0).toLocaleString()}</span>
          </span>
          <ToggleGroup type="single" size="sm" value={view} onValueChange={v => v && setView(v as "graph" | "table")}>
            <ToggleGroupItem value="graph" className="h-7 px-2 text-xs" aria-label={t("graph_view_graph")}>
              <NetworkIcon className="size-3.5" />
              {t("graph_view_graph")}
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="h-7 px-2 text-xs" aria-label={t("graph_view_table")}>
              <TableIcon className="size-3.5" />
              {t("graph_view_table")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {!!(schema.data?.labels?.length || schema.data?.relationships?.length) && (
        <div className="flex flex-wrap items-center gap-1">
          {(schema.data?.labels ?? []).map(l => (
            <Badge key={`l-${l}`} variant="secondary" className="cursor-pointer font-normal" onClick={() => setQuery(`MATCH (n:${l})\nRETURN n\nLIMIT 25`)}>
              :{l}
            </Badge>
          ))}
          {(schema.data?.relationships ?? []).map(r => (
            <Badge
              key={`r-${r}`}
              variant="outline"
              className="cursor-pointer font-normal"
              onClick={() => setQuery(`MATCH (n)-[r:${r}]->(m)\nRETURN n, r, m\nLIMIT 25`)}
            >
              -[:{r}]-
            </Badge>
          ))}
        </div>
      )}

      <CodeEditor
        value={query}
        language="cypher"
        defaultHeight={150}
        className="shrink-0"
        beforeMount={registerCypher}
        options={{ minimap: { enabled: false }, lineNumbers: "off", scrollBeyondLastLine: false }}
        onChange={val => setQuery(val ?? "")}
        onMount={(editor, monaco) => {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => execute(editor.getValue()))
        }}
      />

      {error && <p className="text-destructive bg-destructive/10 rounded-md px-3 py-2 font-mono text-xs break-all">{error}</p>}

      <div className="min-h-0 flex-1">
        {view === "graph" ? (
          <GraphCanvas nodes={nodes} edges={edges} />
        ) : (
          <DataTable
            columns={tableColumns}
            data={tableRows}
            className="border-0"
            loading={run.isPending}
            loadingText={t("loading")}
            emptyText={t("no_items")}
          />
        )}
      </div>

      {stats.length > 0 && <p className="text-muted-foreground shrink-0 truncate text-xs">{stats.join(" · ")}</p>}
    </div>
  )
}
