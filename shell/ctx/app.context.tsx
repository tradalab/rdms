"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { useTabStore } from "@/stores/tab.store"
import { toast } from "@tradalab/lyra/ui"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"
import { ConnectionReq as ConnectionDO } from "@/types"
import { useSetting } from "@/hooks/api/setting.api"
import { useConnect, useDisconnect } from "@/hooks/api/client.api"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SshProvider } from "@/app/_components/ssh/ssh.provider"
import { TlsProvider } from "@/app/_components/tls/tls.provider"
import { ProxyProvider } from "@/app/_components/proxy/proxy.provider"
import { ConnectionProvider } from "@/app/_components/connection/connection.provider"
import { GroupProvider } from "@/app/_components/group/group.provider"
import { UpdaterProvider } from "@/app/_components/updater/updater.provider"

interface AppContextType {
  selectedTab: string
  setSelectedTab: (tab: string) => void

  selectedDb?: string
  setSelectedDb: (id?: string) => void

  selectedDbIdx: number
  setSelectedDbIdx: (idx: number) => void

  loading: boolean
  setLoading: (state: boolean) => void

  connect: (database: ConnectionDO | undefined, dbIdx: number) => Promise<any>
  disconnect: (database: ConnectionDO | undefined) => Promise<void>

  language: string | undefined
  setLanguage: (val: string) => void

  compactMode: boolean
  setCompactMode: (val: boolean) => void
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AppContextInner>{children}</AppContextInner>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

function AppContextInner({ children }: { children: ReactNode }) {
  const [selectedTab, setSelectedTab] = useState<string>("/connections")
  const [selectedDb, setSelectedDb] = useState<string | undefined>()
  const [selectedDbIdx, setSelectedDbIdx] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [language, setLanguage] = useSetting("language")
  const [compact, setCompact] = useSetting("compact_mode")
  const compactMode = compact === "true"

  const { tabs, activeTabId, addTab } = useTabStore()
  const [lastSyncTabId, setLastSyncTabId] = useState<string | undefined>()

  const connectMutation = useConnect()
  const disconnectMutation = useDisconnect()

  useEffect(() => {
    i18n.changeLanguage(language)
  }, [language])

  useEffect(() => {
    if (compactMode) {
      document.documentElement.setAttribute("data-compact", "true")
    } else {
      document.documentElement.removeAttribute("data-compact")
    }
  }, [compactMode])

  useEffect(() => {
    if (!activeTabId || activeTabId === lastSyncTabId) return
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab) {
      setSelectedDb(activeTab.connectionId)
      setSelectedDbIdx(activeTab.databaseIdx)
      setSelectedTab("/browser")
      setLastSyncTabId(activeTabId)
    }
  }, [activeTabId, tabs, lastSyncTabId])

  const connect = async (database: ConnectionDO | undefined, dbIdx: number) => {
    if (!database) return
    setLoading(true)
    try {
      await connectMutation.mutateAsync({ connection_id: database.id, database_index: dbIdx })
      setSelectedDbIdx(dbIdx)
      setSelectedDb(database.id)
      setSelectedTab("/browser")
      addTab({
        type: "general",
        title: database.name || "General",
        connectionId: database.id,
        connectionName: database.name,
        databaseIdx: dbIdx,
      })
      return {}
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      if (msg == `client ${database.id}:${dbIdx} already exists`) {
        setSelectedTab("/browser")
        addTab({
          type: "general",
          title: database.name || "General",
          connectionId: database.id,
          connectionName: database.name,
          databaseIdx: dbIdx,
        })
        return
      }
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async (database: ConnectionDO | undefined) => {
    if (!database) return
    try {
      await disconnectMutation.mutateAsync({ connection_id: database.id, database_index: 0 })
      setSelectedDb(undefined)
      setSelectedDbIdx(0)
      toast.add({ title: "Disconnected!", type: "success" })
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error"
      toast.add({ title: msg, type: "error" })
    }
  }

  return (
    <AppContext.Provider
      value={{
        selectedTab,
        setSelectedTab,
        selectedDb,
        setSelectedDb,
        selectedDbIdx,
        setSelectedDbIdx,
        loading,
        setLoading,
        connect,
        disconnect,
        language,
        setLanguage,
        compactMode,
        setCompactMode: (val: boolean) => setCompact(val ? "true" : "false"),
      }}
    >
      <UpdaterProvider>
        <SshProvider>
          <TlsProvider>
            <ProxyProvider>
              <ConnectionProvider>
                <GroupProvider>{children}</GroupProvider>
              </ConnectionProvider>
            </ProxyProvider>
          </TlsProvider>
        </SshProvider>
      </UpdaterProvider>
    </AppContext.Provider>
  )
}

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error("useAppContext must be used inside AppProvider")
  }
  return ctx
}
