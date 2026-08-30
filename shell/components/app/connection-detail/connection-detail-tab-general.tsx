"use client"

import { useEffect, useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { Spinner } from "@tradalab/lyra/ui"
import {
  Server,
  Users,
  Zap,
  Save,
  Activity,
  Network,
  Cpu,
  Box,
  Share2,
  Key,
  Database,
  ChevronLeft,
  ChevronRight,
  Info,
  LucideIcon,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@tradalab/lyra/ui"
import { Card, CardContent } from "@tradalab/lyra/ui"
import { cn } from "@/lib/utils"
import { Button } from "@tradalab/lyra/ui"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@tradalab/lyra/ui"
import { useConnectionGeneral } from "@/hooks/api/client.api"
import { parseRedisInfo } from "@/lib/utils"
import { Switch } from "@tradalab/lyra/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"

const SECTION_ICONS: Record<string, LucideIcon> = {
  Server,
  Clients: Users,
  Memory: Zap,
  Persistence: Save,
  Stats: Activity,
  Replication: Network,
  CPU: Cpu,
  Modules: Box,
  Cluster: Share2,
  Keyspace: Key,
}

type SummaryCardProps = {
  title: string
  value: string
  icon: LucideIcon
  colorClass: string
  extra?: React.ReactNode
}

function SummaryCard({ title, value, icon: Icon, colorClass, extra }: SummaryCardProps) {
  return (
    <Card className="shadow-none border-none bg-transparent">
      <CardContent className="py-0 px-2 flex items-center gap-2">
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", colorClass)}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {extra}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ConnectionDetailTabGeneral({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()

  const [activeSection, setActiveSection] = useState<string>("Server")
  const [collapsed, setCollapsed] = useState<boolean>(false)
  const [autoEnabled, setAutoEnabled] = useState<boolean>(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(10000)

  const query = useConnectionGeneral(connectionId, databaseIdx, {
    refetchInterval: autoEnabled ? refreshInterval : false,
  })

  useEffect(() => {
    if (query.error) {
      const msg = query.error instanceof Error ? query.error.message : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }, [query.error, t])

  const info = useMemo(() => {
    if (!query.data?.info) return undefined
    return parseRedisInfo(query.data.info) as Record<string, Record<string, any>>
  }, [query.data?.info])

  const loading = query.isLoading || query.isFetching

  useEffect(() => {
    if (info && !info[activeSection]) {
      setActiveSection(Object.keys(info)[0] || "Server")
    }
  }, [info, activeSection])

  const summaryMetrics = useMemo(() => {
    if (!info) return null

    const dbKey = `db${databaseIdx}`
    const dbInfo = info.Keyspace?.[dbKey] as string | undefined
    let keysCount = "0"
    if (dbInfo) {
      const match = dbInfo.match(/keys=(\d+)/)
      if (match) keysCount = match[1]
    }

    return {
      memory: info.Memory?.used_memory_human || "N/A",
      clients: info.Clients?.connected_clients || "N/A",
      version: info.Server?.redis_version || "N/A",
      uptime: info.Server?.uptime_in_days || "0",
      keys: keysCount,
    }
  }, [info, databaseIdx])

  const handleManualRefresh = () => {
    query.refetch()
  }

  const handleToggleAutoRefresh = (checked: boolean) => {
    setAutoEnabled(checked)
  }

  const handleIntervalChange = (next: number) => {
    setRefreshInterval(next)
  }

  if (loading && !info) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!info || !summaryMetrics) {
    return null
  }

  const sections = Object.keys(info)

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative text-sm">
      <div className={cn("flex flex-col border-r bg-muted/30 transition-all duration-300 ease-in-out shrink-0 overflow-hidden", collapsed ? "w-12.5" : "w-56")}>
        <div className="p-2 flex items-center justify-between">
          {!collapsed && <span className="font-semibold text-xs px-1 opacity-70 uppercase tracking-wider">{t("sections")}</span>}
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sections.map(section => {
            const Icon = SECTION_ICONS[section] || Info
            const isActive = activeSection === section
            return (
              <TooltipProvider key={section} delayDuration={500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-2 px-2 h-9", isActive && "bg-secondary/70 font-medium")}
                      onClick={() => setActiveSection(section)}
                    >
                      <Icon size={16} className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      {!collapsed && <span className="truncate">{section}</span>}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{section}</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="p-2 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-2 border-b bg-muted/10 shrink-0">
          <SummaryCard title={t("Memory")} value={summaryMetrics.memory} icon={Zap} colorClass="bg-blue-500/10 text-blue-500" />
          <SummaryCard title={t("Keys (DB " + databaseIdx + ")")} value={summaryMetrics.keys} icon={Database} colorClass="bg-green-500/10 text-green-500" />
          <SummaryCard title={t("Clients")} value={summaryMetrics.clients} icon={Users} colorClass="bg-amber-500/10 text-amber-500" />
          <SummaryCard
            title={t("Version")}
            value={summaryMetrics.version}
            icon={Info}
            colorClass="bg-purple-500/10 text-purple-500"
            extra={
              <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
                {summaryMetrics.uptime}d up
              </Badge>
            }
          />
        </div>

        <div className="flex-1 overflow-auto p-0">
          <div className="flex items-center justify-between p-2 gap-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
            <div className="flex items-center gap-2">
              {activeSection && (
                <>
                  {(() => {
                    const Icon = SECTION_ICONS[activeSection] || Info
                    return <Icon size={18} className="text-primary" />
                  })()}
                  <h2 className="text-base font-semibold">{activeSection}</h2>
                  <Badge variant="secondary" className="ml-2 font-normal text-[10px] h-5 opacity-70">
                    {Object.keys(info[activeSection] || {}).length} Fields
                  </Badge>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-2.5 h-8">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Auto")}</span>
                <Select value={String(refreshInterval / 1000)} onValueChange={val => handleIntervalChange(Number(val) * 1000)}>
                  <SelectTrigger className="h-6 w-[56px] border-none bg-transparent shadow-none focus:ring-0 text-xs px-1 hover:bg-muted transition-colors font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5s</SelectItem>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">60s</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-[1px] bg-muted-foreground/20 mx-0.5" />
                <Switch checked={autoEnabled} onCheckedChange={handleToggleAutoRefresh} className="scale-75" />
              </div>

              <Button variant="outline" size="sm" className="h-8 gap-2 min-w-[90px]" onClick={handleManualRefresh} disabled={loading}>
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
                <span>{t("Refresh")}</span>
              </Button>
            </div>
          </div>

          <div className="px-2 pb-2 mt-2">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableHead className="w-1/3 py-2 text-xs uppercase tracking-wider">{t("property")}</TableHead>
                    <TableHead className="w-2/3 py-2 text-xs uppercase tracking-wider">{t("value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(info[activeSection] || {}).map(([key, value]) => (
                    <TableRow key={key} className="group transition-colors">
                      <TableCell className="font-medium align-top py-2 text-muted-foreground group-hover:text-foreground">{key}</TableCell>
                      <TableCell className="font-mono text-xs py-2 break-all text-foreground/90">{String(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
