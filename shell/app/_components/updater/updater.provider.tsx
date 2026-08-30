"use client"

import { ReactNode, useEffect, useRef, useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import scorix from "@/lib/scorix"
import { openExternal } from "@/lib/open-external"
import { system } from "@/api"
import { cn } from "@/lib/utils"
import { useSetting, useSettings } from "@/hooks/api/setting.api"
import { Spinner, toast } from "@tradalab/lyra/ui"
import { UpdaterContext } from "./updater.context"

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [newVersion, setNewVersion] = useState<string | undefined>()
  const [notes, setNotes] = useState<string | undefined>()
  const { loading: settingsLoading } = useSettings()
  const [autoupdate] = useSetting("autoupdate")
  const [lastCheck, setLastCheck] = useSetting("last_update_check", { silent: true })

  const checkUpdate = useCallback(
    async (options?: { silent?: boolean }) => {
      setLoading(true)
      try {
        const res: { new_version: string; notes: string } = await scorix.invoke("mod:updater:CheckForUpdate", {})
        setNewVersion(res.new_version)
        setNotes(res.notes)
        await setLastCheck(Date.now().toString())
        return res
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
        const isNoUpdate = msg === "no update available"

        if (!options?.silent && !isNoUpdate && !msg.includes("No connection could be made because the target machine actively refused it")) {
          toast.add({ title: t(msg as any, { defaultValue: msg }), type: "error" })
        }

        if (isNoUpdate) {
          await setLastCheck(Date.now().toString())
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    [setLastCheck, t]
  )

  const fullUpdate = useCallback(async () => {
    setLoading(true)
    try {
      const info = await system.info({})
      if (info.os === "linux" || info.os === "darwin") {
        openExternal("https://github.com/tradalab/redishub/releases")
        return
      }
      await scorix.invoke("mod:updater:FullUpdate", {})
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "unknown_error"
      toast.add({ title: t(msg as any, { defaultValue: msg }), type: "error" })
    } finally {
      setLoading(false)
    }
  }, [t])

  const popup = useCallback(() => {
    if (!newVersion || !notes) return

    // Base UI's `actionProps` describes a single <button>, so the two-button
    // row lives in `description` instead. `timeout: 0` is Base UI's "never
    // auto-dismiss" (sonner spelled it `duration: Infinity`), and the classes
    // sonner applied via `classNames` are inlined here.
    toast.add({
      id: "updater",
      title: t("update_available", { v: newVersion }),
      description: (
        <div className="w-full">
          <div className="whitespace-pre-line">{notes}</div>
          <div className="flex gap-2 mt-2">
            <button
              data-button="true"
              data-cancel="true"
              disabled={loading}
              className={cn("", { "!text-muted-foreground !cursor-not-allowed": loading })}
              onClick={() => toast.close("updater")}
            >
              {t("later")}
            </button>
            <button
              data-button="true"
              data-action="true"
              disabled={loading}
              className={cn("", { "!text-muted-foreground !cursor-not-allowed": loading })}
              onClick={() => fullUpdate()}
            >
              {loading && <Spinner />} {t("update")}
            </button>
          </div>
        </div>
      ),
      timeout: 0,
    })
  }, [newVersion, notes, t, loading, fullUpdate])

  const checkUpdateRef = useRef(checkUpdate)
  const popupRef = useRef(popup)
  checkUpdateRef.current = checkUpdate
  popupRef.current = popup

  useEffect(() => {
    if (settingsLoading) return
    if (autoupdate === "false") return

    const last = parseInt(lastCheck || "0")
    if (Date.now() - last < 24 * 60 * 60 * 1000) return

    checkUpdateRef.current({ silent: true }).then(res => {
      if (res) popupRef.current()
    })
  }, [settingsLoading, autoupdate, lastCheck])

  return <UpdaterContext.Provider value={{ loading, newVersion, notes, checkUpdate, fullUpdate, popup }}>{children}</UpdaterContext.Provider>
}
