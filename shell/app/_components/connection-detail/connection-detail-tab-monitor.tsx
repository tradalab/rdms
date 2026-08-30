"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Separator } from "@tradalab/lyra/ui"
import { Input } from "@tradalab/lyra/ui"
import { useMonitorSession } from "@/hooks/api/monitor.api"
import { Trash2, Play, Pause, Activity, Search, RefreshCcwIcon } from "lucide-react"

interface MonitorMessage {
  time: number
  message: any
}

const MAX_MESSAGES = 1000

export function ConnectionDetailTabMonitor({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<MonitorMessage[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterKeyword, setFilterKeyword] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const onMessage = useCallback((line: string) => {
    setMessages(prev => {
      const updated = [...prev, { time: Date.now(), message: line }]
      if (updated.length > MAX_MESSAGES) return updated.slice(updated.length - MAX_MESSAGES)
      return updated
    })
  }, [])

  const { active: isMonitoring, loading: isLoading, start: startMonitor, stop: stopMonitor } = useMonitorSession(connectionId, databaseIdx, onMessage)

  useEffect(() => {
    startMonitor()
    return () => {
      stopMonitor()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId])

  const filteredMessages = useMemo(() => {
    if (!filterKeyword) return messages
    const lowKeyword = filterKeyword.toLowerCase()
    return messages.filter(msg => {
      const content = typeof msg.message === "string" ? msg.message : JSON.stringify(msg.message)
      return content.toLowerCase().includes(lowKeyword)
    })
  }, [messages, filterKeyword])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, autoScroll])

  const formatTime = (time: number) => {
    const d = new Date(time)
    return d.toLocaleTimeString() + "." + d.getMilliseconds().toString().padStart(3, "0")
  }

  return (
    <Card className="w-full h-full border bg-background flex flex-col rounded-none border-none shadow-none p-0">
      <CardContent className="p-0 flex flex-col w-full h-full">
        <div className="flex items-center justify-between px-4 h-11 border-b bg-muted/10 shrink-0">
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground uppercase">{t("monitor")}</span>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <span>
              {messages.length} / {MAX_MESSAGES}
            </span>
            {isMonitoring ? (
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse ml-2" />
            ) : (
              <span className="flex h-2 w-2 rounded-full bg-red-500 ml-2" />
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            <div className="relative flex items-center min-w-[100px] sm:min-w-[180px]">
              <Search className="absolute left-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder={t("filter")}
                value={filterKeyword}
                onChange={e => setFilterKeyword(e.target.value)}
                className="h-7 w-full pl-7 text-[11px] bg-muted/20"
              />
            </div>

            <Separator orientation="vertical" className="h-7 mx-0.5 sm:mx-1" />

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 flex-shrink-0"
              onClick={isMonitoring ? stopMonitor : startMonitor}
              disabled={isLoading}
              title={isLoading ? t("waiting") : isMonitoring ? t("monitor_stop") : t("monitor_start")}
            >
              {isLoading ? (
                <RefreshCcwIcon className="h-3 w-3 animate-spin" />
              ) : isMonitoring ? (
                <Pause className="h-3 w-3 text-red-500" />
              ) : (
                <Play className="h-3 w-3 text-green-500" />
              )}
              <span className="hidden lg:inline ml-1">{isLoading ? t("waiting") : isMonitoring ? t("monitor_stop") : t("monitor_start")}</span>
            </Button>

            <Separator orientation="vertical" className="h-7 mx-0.5 sm:mx-1" />

            <Button variant="destructive" size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={() => setMessages([])} title={t("pubsub_clear")}>
              <Trash2 className="h-3 w-3" />
              <span className="hidden lg:inline ml-1">{t("pubsub_clear")}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 flex-shrink-0"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? t("pubsub_pause_scroll_desc") : t("pubsub_resume_scroll_desc")}
            >
              {autoScroll ? <Pause className="h-3 w-3 text-primary" /> : <Play className="h-3 w-3" />}
              <span className="hidden lg:inline ml-1">{autoScroll ? t("pubsub_pause_scroll") : t("pubsub_auto_scroll")}</span>
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs leading-tight bg-muted/5 text-foreground">
          {isMonitoring && (
            <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
              <Activity className="h-3 w-3 shrink-0" />
              <span>
                {t("monitor_desc")} {t("monitor_warning")}
              </span>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-muted-foreground h-full flex flex-col items-center justify-center italic gap-3">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <span>{isMonitoring ? t("pubsub_waiting_events") : t("monitor_click_start")}</span>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-muted/50 py-0.5 px-1 rounded transition-colors break-all">
                <span className="text-muted-foreground shrink-0 opacity-70">[{formatTime(msg.time)}]</span>
                <span className="text-foreground">{typeof msg.message === "string" ? msg.message : JSON.stringify(msg.message)}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
