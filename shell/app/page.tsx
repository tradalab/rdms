"use client"

import { useAppContext } from "@/ctx/app.context"
import { useTranslation } from "react-i18next"
import { useTabStore } from "@/stores/tab.store"
import { TabBar } from "@/app/_components/layout/tab-bar"
import { ConnectionDetailTabGeneral } from "@/app/_components/connection-detail/connection-detail-tab-general"
import { ConnectionDetailTabConsole } from "@/app/_components/connection-detail/connection-detail-tab-console"
import { ConnectionDetailTabKeyDetail } from "@/app/_components/connection-detail/connection-detail-tab-key-detail"
import { ConnectionDetailTabSlowQuery } from "@/app/_components/connection-detail/connection-detail-tab-slow-query"
import { ConnectionDetailTabPubSub } from "@/app/_components/connection-detail/connection-detail-tab-pubsub"
import { ConnectionDetailTabKeyList } from "@/app/_components/connection-detail/connection-detail-tab-key-list"
import { ConnectionDetailTabMonitor } from "@/app/_components/connection-detail/connection-detail-tab-monitor"
import { ConnectionDetailTabAnalysis } from "@/app/_components/connection-detail/connection-detail-tab-analysis"

export default function Page() {
  const { t } = useTranslation()
  const { selectedDb } = useAppContext()
  const { tabs, activeTabId } = useTabStore()

  return (
    <div className="flex flex-col h-full min-h-0">
      <TabBar />
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{t("select_item_hint")}</div>
        ) : (
          tabs.map(tab => {
            const isActive = tab.id === activeTabId
            return (
              <div key={tab.id} className={`absolute inset-0 min-h-0 overflow-hidden ${isActive ? "" : "hidden"}`}>
                {tab.type === "general" && <ConnectionDetailTabGeneral connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "console" && <ConnectionDetailTabConsole connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "key-detail" && (
                  <ConnectionDetailTabKeyDetail connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} selectedKey={tab.key} />
                )}
                {tab.type === "slow-query" && <ConnectionDetailTabSlowQuery connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "pubsub" && <ConnectionDetailTabPubSub connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "monitor" && <ConnectionDetailTabMonitor connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "key-list" && <ConnectionDetailTabKeyList connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
                {tab.type === "analysis" && <ConnectionDetailTabAnalysis connectionId={tab.connectionId} databaseIdx={tab.databaseIdx} />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
