"use client"

import { ComponentProps } from "react"
import { StackedSidebar } from "@tradalab/lyra/shell"
import { SidebarConnection } from "@/app/_components/sidebar/sidebar-connection"
import { SidebarBrowser } from "@/app/_components/sidebar/sidebar-browser"
import { useAppContext } from "@/ctx/app.context"
import { SidebarTool } from "@/app/_components/sidebar/sidebar-tool"

export function AppSidebar({ ...props }: ComponentProps<typeof StackedSidebar>) {
  const { selectedTab } = useAppContext()

  return (
    <StackedSidebar {...props}>
      <SidebarTool />
      {selectedTab == "/connections" && <SidebarConnection />}
      {selectedTab == "/browser" && <SidebarBrowser />}
    </StackedSidebar>
  )
}
