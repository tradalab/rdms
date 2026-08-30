"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { RefreshCcw, Wifi, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function ConnectionStatus() {
  const { t } = useTranslation()
  const [status, setStatus] = React.useState<"connected" | "connecting" | "disconnected">("connected")
  const [isWebMode, setIsWebMode] = React.useState(false)

  React.useEffect(() => {
    const checkMode = () => {
      const webMode = typeof window !== "undefined" && window.scorix?.mode === "web"
      setIsWebMode(webMode)

      if (webMode && window.scorix?.status) {
        setStatus(window.scorix.status())
      }
    }

    checkMode()

    const handleStatusChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) setStatus(detail)
    }

    window.addEventListener("scorix:connection:status", handleStatusChange)
    return () => {
      window.removeEventListener("scorix:connection:status", handleStatusChange)
    }
  }, [])

  if (!isWebMode) return null

  const handleReconnect = () => {
    if (window.scorix) {
      window.scorix.init().catch(console.error)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {status === "connected" ? (
        <Badge
          variant="outline"
          className="bg-background/80 backdrop-blur border-green-500/50 text-green-600 dark:text-green-400 gap-1.5 px-3 py-1 shadow-sm transition-all hover:bg-green-50/50 dark:hover:bg-green-950/20"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <Wifi className="h-3.5 w-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">{t("conn_connected")}</span>
        </Badge>
      ) : status === "connecting" ? (
        <Badge
          variant="outline"
          className="bg-background/80 backdrop-blur border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1.5 px-3 py-1 shadow-sm transition-all animate-pulse"
        >
          <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs font-medium uppercase tracking-wider">{t("conn_connecting")}</span>
        </Badge>
      ) : (
        <div className="flex items-center gap-2 drop-shadow-xl">
          <Badge variant="destructive" className="gap-1.5 px-3 py-1 shadow-sm transition-all">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">{t("conn_disconnected")}</span>
          </Badge>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 border shadow-sm hover:bg-secondary/80 bg-background/80 backdrop-blur"
            onClick={handleReconnect}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{t("reconnect")}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
