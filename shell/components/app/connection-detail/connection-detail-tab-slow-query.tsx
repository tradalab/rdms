"use client"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSlowQuery } from "@/hooks/api/client.api"
import { Spinner, toast } from "@tradalab/lyra/ui"

function formatDuration(us: number | string | undefined): string {
  if (!us) return "-"
  const micro = typeof us === "string" ? parseFloat(us) : us
  if (isNaN(micro)) return us as string
  const ms = micro / 1_000_000
  return ms < 1 ? "<1 ms" : `${ms.toFixed(2)} ms`
}

export function ConnectionDetailTabSlowQuery({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const query = useSlowQuery(connectionId, databaseIdx)
  const logs = query.data?.items
  const loading = query.isLoading

  useEffect(() => {
    if (query.error) {
      const msg = query.error instanceof Error ? query.error.message : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  }, [query.error, t])

  if (loading) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return <div className="h-full w-full flex justify-center items-center text-muted-foreground">{t("no_slow_queries")}</div>
  }

  return (
    <div className="h-full flex flex-col overflow-auto rounded-md border">
      <div className="grid grid-cols-[200px_200px_100px_1fr] bg-muted/20 dark:bg-muted/50 font-semibold gap-2 p-2 sticky top-0 z-10 border-b">
        <div>{t("time")}</div>
        <div>{t("client_addr")}</div>
        <div>{t("duration")}</div>
        <div>{t("command")}</div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col">
          {logs.map((log, idx) => {
            const duration = formatDuration(log?.duration)
            const time = new Date(log?.timestamp * 1000).toLocaleString()
            return (
              <div
                key={idx}
                className="grid grid-cols-[200px_200px_100px_1fr] items-center gap-2 p-2 border-b border-border transition-colors hover:bg-muted/50 dark:hover:bg-muted/70"
              >
                <div className="truncate" title={time}>
                  {time}
                </div>
                <div className="truncate">{log?.client_addr}</div>
                <div className="truncate">{duration}</div>
                <div className="truncate" title={log?.command?.join?.("\n")}>
                  {log?.command?.join?.(" ")}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
