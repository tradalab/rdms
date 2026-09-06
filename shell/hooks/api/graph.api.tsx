"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { graph } from "@/api"
import type { GraphQueryRes, GraphSchemaRes } from "@/types"

const GRAPH_SCHEMA_BASE = "redis-graph-schema"

// A pure read's statistics block lists only cache and timing lines.
const CHANGED = /\b(created|deleted|removed|set|added|updated)\b/i

export function useGraphSchema(connectionId: string, databaseIdx: number, key: string | undefined) {
  return useQuery<GraphSchemaRes>({
    queryKey: [GRAPH_SCHEMA_BASE, connectionId, databaseIdx, key],
    queryFn: () => graph.schema({ connection_id: connectionId, database_index: databaseIdx, graph: key! }),
    enabled: !!connectionId && !!key,
    // A schema read is five round trips; three default retries make it twenty.
    retry: false,
  })
}

export function useGraphQuery(connectionId: string, databaseIdx: number, key: string | undefined) {
  const qc = useQueryClient()
  return useMutation<GraphQueryRes, Error, string>({
    mutationFn: query => graph.query({ connection_id: connectionId, database_index: databaseIdx, graph: key!, query }),
    // Only a write can have moved the labels, counts or property keys.
    onSuccess: res => {
      if ((res.stats ?? []).some(line => CHANGED.test(line))) {
        qc.invalidateQueries({ queryKey: [GRAPH_SCHEMA_BASE, connectionId, databaseIdx, key] })
      }
    },
  })
}
