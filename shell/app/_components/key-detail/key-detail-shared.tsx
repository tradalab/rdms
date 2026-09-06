"use client"

import { ReactNode } from "react"
import { Badge } from "@tradalab/lyra/ui"
import { cn } from "@/lib/utils"

// Per-type accent colours, tuned to read on both light and dark surfaces.
// Full literal class strings so Tailwind's scanner keeps them in the build.
const KIND_BADGE: Record<string, string> = {
  string: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  json: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  "rejson-rl": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  list: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  hash: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  set: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  zset: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  stream: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  graphdata: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

export function KindBadge({ kind, className }: { kind?: string; className?: string }) {
  if (!kind) return null
  return (
    <Badge variant="secondary" className={cn("border-transparent font-mono text-[11px] uppercase tracking-wide", KIND_BADGE[kind], className)}>
      {kind}
    </Badge>
  )
}

// Monospace, wrapping text for value / member / field table cells so long or
// binary-ish payloads stay readable instead of overflowing the row.
export function CellText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs break-all whitespace-pre-wrap", className)}>{children}</span>
}
