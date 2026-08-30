"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { analysis } from "@/api"
import type { ServerStream } from "@/lib/scorix"
import type { AnalysisProfileEvent } from "@/types"

export type AnalysisMode = "fast" | "sampled" | "full"

export function useAnalysisProfile(connectionId: string, databaseIdx: number) {
  const [event, setEvent] = useState<AnalysisProfileEvent | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<ServerStream<AnalysisProfileEvent> | null>(null)

  const cancel = useCallback(() => {
    streamRef.current?.cancel()
    streamRef.current = null
    setRunning(false)
  }, [])

  const run = useCallback(
    async (mode: AnalysisMode, sampleSize = 0) => {
      if (streamRef.current) return
      setError(null)
      setRunning(true)
      const stream = analysis.profile({
        connection_id: connectionId,
        database_index: databaseIdx,
        mode,
        sample_size: sampleSize,
      })
      streamRef.current = stream
      try {
        for await (const f of stream) setEvent(f)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (streamRef.current === stream) streamRef.current = null
        setRunning(false)
      }
    },
    [connectionId, databaseIdx]
  )

  useEffect(
    () => () => {
      streamRef.current?.cancel()
      streamRef.current = null
    },
    []
  )

  return { event, running, error, run, cancel }
}
