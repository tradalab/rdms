"use client"

import { type ElementType } from "react"
import { useTranslation } from "react-i18next"
import { Database, Key, Terminal, Activity, Radio, LayoutGrid, Monitor, ChartColumn } from "lucide-react"
import { TabBar as LyraTabBar, type TabItem } from "@tradalab/lyra/shell"
import { useTabStore, TabType } from "@/stores/tab.store"

const IconMap: Record<TabType, ElementType> = {
  general: Database,
  "key-detail": Key,
  console: Terminal,
  "slow-query": Activity,
  analysis: ChartColumn,
  pubsub: Radio,
  "key-list": LayoutGrid,
  monitor: Monitor,
}

export function TabBar() {
  const { t } = useTranslation()
  const { tabs, activeTabId, setActiveTabId, removeTab, togglePin, closeOthers, closeAll } = useTabStore()

  const items: TabItem[] = tabs.map(tab => {
    const Icon = IconMap[tab.type] || Database
    return {
      id: tab.id,
      title: tab.title,
      pinned: tab.pinned,
      icon: <Icon />,
      subtitle: tab.connectionName ? `${tab.connectionName} (DB${tab.databaseIdx})` : `DB${tab.databaseIdx}`,
    }
  })

  return (
    <LyraTabBar
      tabs={items}
      activeId={activeTabId ?? null}
      onSelect={setActiveTabId}
      onClose={removeTab}
      onTogglePin={togglePin}
      onCloseOthers={closeOthers}
      onCloseAll={closeAll}
      labels={{
        close: t("close"),
        pinTab: t("pin_tab"),
        unpinTab: t("unpin_tab"),
        closeOthers: t("close_others"),
        closeAll: t("close_all"),
      }}
    />
  )
}
