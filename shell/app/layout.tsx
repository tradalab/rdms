import "./globals.css"
import * as React from "react"
import type { Metadata } from "next"
import { SidebarInset, SidebarProvider } from "@tradalab/lyra/ui"
import { AppSidebar } from "@/app/_components/layout/app-sidebar"
import { Toaster } from "@tradalab/lyra/ui"
import { configs } from "@/configs"
import { AppProvider } from "@/ctx/app.context"
import { Loading } from "@/app/_components/loading"
import { ThemeProvider } from "next-themes"
import { ConfirmProvider } from "@tradalab/lyra/blocks"
import { ConnectionStatus } from "@/app/_components/connection-status"
import { TooltipProvider } from "@tradalab/lyra/ui"

export const metadata: Metadata = {
  title: configs.app.name,
  description: configs.app.desc || configs.app.name,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased overscroll-none touch-none select-none`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ConfirmProvider>
            <AppProvider>
              <TooltipProvider delayDuration={0}>
                <SidebarProvider
                  style={
                    {
                      "--sidebar-width": "360px",
                    } as React.CSSProperties
                  }
                  open={true}
                  defaultOpen={true}
                >
                  <AppSidebar />
                  <SidebarInset className="flex flex-col h-svh overflow-hidden">
                    <div className="flex-1 min-h-0 flex flex-col">{children}</div>
                    <Toaster />
                    <Loading />
                    <ConnectionStatus />
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
            </AppProvider>
          </ConfirmProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
