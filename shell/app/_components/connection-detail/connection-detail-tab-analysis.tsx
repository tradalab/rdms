"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangleIcon, PlayIcon, XIcon } from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tradalab/lyra/ui"
import { useAnalysisProfile, type AnalysisMode } from "@/hooks/api/analysis.api"
import type { AnalysisBucket, AnalysisTypeStat } from "@/types"

const KIND_COLOR: Record<string, string> = {
  string: "bg-sky-500",
  list: "bg-violet-500",
  hash: "bg-emerald-500",
  set: "bg-amber-500",
  zset: "bg-rose-500",
  stream: "bg-teal-500",
  "rejson-rl": "bg-indigo-500",
  graphdata: "bg-fuchsia-500", // rose is taken by zset in this map; two bars the same colour answer nothing
  other: "bg-zinc-400",
}
const kindColor = (k: string) => KIND_COLOR[k] ?? "bg-zinc-400"

function bytes(n: number): string {
  if (!n) return "0 B"
  const u = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1)
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

const num = (n: number) => n.toLocaleString()

function ttlLabel(ms: number): string {
  if (ms < 0) return "—"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// OBJECT IDLETIME answers in seconds.
function ageLabel(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86400)}d`
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      <div className="text-lg font-semibold tabular-nums truncate">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
    </div>
  )
}

function BarList({ items, colorClass }: { items: { label: string; count: number }[]; colorClass?: string }) {
  const max = Math.max(1, ...items.map(i => i.count))
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <div className="w-16 shrink-0 text-right text-muted-foreground tabular-nums">{i.label}</div>
          <div className="h-3 flex-1 rounded-sm bg-muted/60 overflow-hidden">
            <div className={`h-full rounded-sm ${colorClass ?? "bg-sky-500"}`} style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
          <div className="w-20 shrink-0 tabular-nums text-muted-foreground">{num(i.count)}</div>
        </div>
      ))}
    </div>
  )
}

function TypeBar({ types, total }: { types: AnalysisTypeStat[]; total: number }) {
  const sum = types.reduce((a, b) => a + b.keys, 0) || total || 1
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {types.map(t => (
          <div key={t.kind} className={kindColor(t.kind)} style={{ width: `${(t.keys / sum) * 100}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
        {types.map(t => (
          <div key={t.kind} className="flex items-center gap-2 text-xs">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${kindColor(t.kind)}`} />
            <span className="truncate">{t.kind}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {num(t.keys)} · {((t.keys / sum) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function ConnectionDetailTabAnalysis({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<AnalysisMode>("fast")
  const [sampleSize, setSampleSize] = useState("10000")
  const { event, running, error, run, cancel } = useAnalysisProfile(connectionId, databaseIdx)

  useEffect(() => {
    run("fast")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, databaseIdx])

  const sizeCharts = useMemo(() => (event?.distrib ?? []).filter(d => (d.buckets ?? []).length > 0), [event])
  const scanned = event?.scanned ?? 0
  const progress = event && event.total > 0 ? Math.min(100, (scanned / event.total) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
        <Select value={mode} onValueChange={v => setMode(v as AnalysisMode)} disabled={running}>
          <SelectTrigger size="sm" className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fast">{t("analysis_mode_fast")}</SelectItem>
            <SelectItem value="sampled">{t("analysis_mode_sampled")}</SelectItem>
            <SelectItem value="full">{t("analysis_mode_full")}</SelectItem>
          </SelectContent>
        </Select>

        {mode === "sampled" && (
          <Select value={sampleSize} onValueChange={setSampleSize} disabled={running}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1000", "10000", "50000", "200000"].map(n => (
                <SelectItem key={n} value={n}>
                  {num(Number(n))} {t("analysis_sample_keys")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {running ? (
          <Button size="sm" variant="outline" onClick={cancel}>
            <XIcon />
            {t("cancel")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => run(mode, mode === "sampled" ? Number(sampleSize) : 0)}>
            <PlayIcon />
            {t("run")}
          </Button>
        )}

        {running && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner />
            {event?.phase === "scan" ? `${t("analysis_scanning")} ${num(scanned)} / ${num(event?.total ?? 0)}` : t("analysis_reading_info")}
            {progress > 0 && (
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {event?.redis_version && <span>Redis {event.redis_version}</span>}
          {event?.distrib_source && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted">
                    {event.distrib_source === "keysizes" ? t("analysis_source_keysizes") : t("analysis_source_scan")}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {event.distrib_source === "keysizes" ? t("analysis_source_keysizes_hint") : t("analysis_source_scan_hint")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-3 p-4">
          {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</div>}

          {(event?.warnings ?? []).map(w => (
            <div
              key={w}
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
            >
              <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}

          <Card className="shadow-none">
            <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label={t("analysis_keys")} value={num(event?.total ?? 0)} hint={scanned > 0 ? `${num(scanned)} ${t("analysis_scanned")}` : undefined} />
              <Stat
                label={t("analysis_mem_used")}
                value={bytes(event?.memory.used ?? 0)}
                hint={event?.memory.maxmemory ? `${t("analysis_mem_max")} ${bytes(event.memory.maxmemory)}` : undefined}
              />
              <Stat label={t("analysis_mem_peak")} value={bytes(event?.memory.peak ?? 0)} />
              <Stat
                label={t("analysis_mem_dataset")}
                value={bytes(event?.memory.dataset ?? 0)}
                hint={`${t("analysis_mem_overhead")} ${bytes(event?.memory.overhead ?? 0)}`}
              />
              <Stat label={t("analysis_fragmentation")} value={event?.memory.fragmentation ? event.memory.fragmentation.toFixed(2) : "—"} />
              <Stat
                label={t("analysis_policy")}
                value={event?.memory.policy || "—"}
                hint={event?.recency_metric === "freq" ? "OBJECT FREQ" : "OBJECT IDLETIME"}
              />
            </CardContent>
          </Card>

          <Panel title={t("analysis_by_type")} subtitle={t("analysis_by_type_hint")}>
            {(event?.types ?? []).length > 0 ? (
              <TypeBar types={event?.types ?? []} total={event?.total ?? 0} />
            ) : (
              <div className="text-xs text-muted-foreground">{t("analysis_no_data")}</div>
            )}
          </Panel>

          <Panel
            title={t("analysis_ttl")}
            subtitle={
              `${num(event?.ttl.with_ttl ?? 0)} / ${num(event?.ttl.total ?? 0)} ${t("analysis_ttl_hint")}` +
              (event?.ttl.avg_ttl_ms ? ` · ${t("analysis_ttl_avg")} ${ttlLabel(event.ttl.avg_ttl_ms)}` : "")
            }
          >
            {(event?.ttl.buckets ?? []).length > 0 ? (
              <BarList items={((event?.ttl.buckets ?? []) as AnalysisBucket[]).map(b => ({ label: b.label, count: b.count }))} colorClass="bg-emerald-500" />
            ) : (
              <div className="text-xs text-muted-foreground">{t("analysis_ttl_needs_scan")}</div>
            )}
          </Panel>

          {sizeCharts.length > 0 && (
            <Panel title={t("analysis_size_distribution")} subtitle={t("analysis_size_distribution_hint")}>
              <div className="grid gap-4 lg:grid-cols-2">
                {sizeCharts.map(d => (
                  <div key={d.kind} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`h-2.5 w-2.5 rounded-sm ${kindColor(d.kind)}`} />
                      <span className="font-medium">{d.kind}</span>
                      <span className="text-muted-foreground">({d.unit === "bytes" ? t("analysis_unit_bytes") : t("analysis_unit_items")})</span>
                    </div>
                    <BarList items={(d.buckets ?? []).map(b => ({ label: b.label, count: b.count }))} colorClass={kindColor(d.kind)} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {(event?.nodes ?? []).length > 0 && (
            <Panel title={t("analysis_nodes")}>
              <BarList items={(event?.nodes ?? []).map(n => ({ label: n.addr, count: n.keys }))} colorClass="bg-violet-500" />
            </Panel>
          )}

          <Panel
            title={event?.truncated ? t("analysis_largest_sampled") : t("analysis_largest")}
            subtitle={scanned > 0 ? t("analysis_largest_hint") : undefined}
          >
            {(event?.top_keys ?? []).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("analysis_key")}</TableHead>
                    <TableHead className="w-28">{t("analysis_type")}</TableHead>
                    <TableHead className="w-28 text-right">{t("analysis_size")}</TableHead>
                    <TableHead className="w-20 text-right">TTL</TableHead>
                    <TableHead className="w-24 text-right">{event?.recency_metric === "freq" ? t("analysis_freq") : t("analysis_idle")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(event?.top_keys ?? []).map(k => (
                    <TableRow key={k.key}>
                      <TableCell className="max-w-0 truncate font-mono text-xs" title={k.key}>
                        {k.key}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className={`h-2 w-2 rounded-sm ${kindColor(k.kind)}`} />
                          {k.kind}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{bytes(k.bytes)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{ttlLabel(k.ttl_ms)}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {k.recency < 0 ? "—" : event?.recency_metric === "freq" ? num(k.recency) : ageLabel(k.recency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-xs text-muted-foreground">{t("analysis_largest_needs_scan")}</div>
            )}
          </Panel>

          <Separator />
          <p className="pb-2 text-[11px] leading-relaxed text-muted-foreground">{t("analysis_footnote")}</p>
        </div>
      </div>
    </div>
  )
}
