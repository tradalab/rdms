"use client"

import { ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@tradalab/lyra/ui"
import { version } from "../../../package.json"
import { openExternal } from "@/lib/open-external"
import { useTranslation } from "react-i18next"
import { Panel } from "@tradalab/lyra/blocks"
import { SettingPanelGeneral } from "./setting-panel-general"

export function SettingDialog({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] p-0 flex flex-col h-[85vh]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">{t("settings")}</DialogTitle>
        </DialogHeader>
        <Panel
          items={[
            {
              key: "general",
              label: t("general"),
              icon: SlidersHorizontal,
              content: <SettingPanelGeneral />,
            },
          ]}
        />
        <DialogFooter className="p-2 border-t flex gap-2">
          <div className="flex items-center justify-between w-full text-sm">
            {/* Not translated: a byline, like the version beside it. The links
                that were here stay in the sidebar, which already had them. */}
            <button
              onClick={() => openExternal("https://github.com/tradalab/scorix")}
              className="text-muted-foreground hover:text-foreground text-[10px] transition-colors hover:underline"
            >
              Powered by scorix
            </button>
            <span className="text-xs font-bold">v{version}</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
