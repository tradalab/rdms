import { create } from "zustand"

export type TabType = "general" | "console" | "key-detail" | "slow-query" | "pubsub" | "key-list" | "monitor" | "analysis"

export interface TabDO {
  id: string
  type: TabType
  title: string
  connectionId: string
  connectionName?: string
  databaseIdx: number
  key?: string
  pinned?: boolean
}

interface TabState {
  tabs: TabDO[]
  activeTabId: string | undefined
  addTab: (tab: Omit<TabDO, "id" | "pinned">) => void
  updateTab: (id: string, updates: Partial<TabDO>) => void
  removeTab: (id: string) => void
  setActiveTabId: (id: string | undefined) => void
  togglePin: (id: string) => void
  closeOthers: (id: string) => void
  closeAll: () => void
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: undefined,

  addTab: tabData => {
    const { tabs } = get()
    // Check if tab already exists
    const existingTab = tabs.find(
      t => t.type === tabData.type && t.connectionId === tabData.connectionId && t.databaseIdx === tabData.databaseIdx && t.key === tabData.key
    )

    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }

    const newId = crypto.randomUUID()
    const newTab: TabDO = { ...tabData, id: newId, pinned: false }
    const newTabs = [...tabs, newTab]

    // Keep pinned tabs at the beginning
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]

    set({
      tabs: sortedTabs,
      activeTabId: newId,
    })
  },

  updateTab: (id, updates) => {
    const { tabs } = get()
    const newTabs = tabs.map(t => (t.id === id ? { ...t, ...updates } : t))
    // Re-sort if pinned status changed
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]
    set({ tabs: sortedTabs })
  },

  removeTab: id => {
    const { tabs, activeTabId } = get()
    const newTabs = tabs.filter(t => t.id !== id)
    let newActiveId = activeTabId

    if (activeTabId === id) {
      if (newTabs.length > 0) {
        newActiveId = newTabs[newTabs.length - 1].id
      } else {
        newActiveId = undefined
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveId })
  },

  setActiveTabId: id => set({ activeTabId: id }),

  togglePin: id => {
    const { tabs } = get()
    const newTabs = tabs.map(t => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    const sortedTabs = [...newTabs.filter(t => t.pinned), ...newTabs.filter(t => !t.pinned)]
    set({ tabs: sortedTabs })
  },

  closeOthers: id => {
    const { tabs } = get()
    const newTabs = tabs.filter(t => t.id === id || t.pinned)
    set({ tabs: newTabs, activeTabId: id })
  },

  closeAll: () => {
    const { tabs, activeTabId } = get()
    const pinnedTabs = tabs.filter(t => t.pinned)
    let newActiveId = activeTabId
    if (activeTabId && !pinnedTabs.find(t => t.id === activeTabId)) {
      newActiveId = pinnedTabs.length > 0 ? pinnedTabs[0].id : undefined
    }
    set({ tabs: pinnedTabs, activeTabId: newActiveId })
  },
}))
