"use client"

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@tradalab/lyra/ui"
import { SidebarDock } from "@tradalab/lyra/shell"
import { BookOpenIcon, BugIcon, DatabaseIcon, LayersIcon, ServerIcon, SettingsIcon } from "lucide-react"
import { configs } from "@/configs"
import { SettingDialog } from "@/app/_components/setting/setting-dialog"
import { useAppContext } from "@/ctx/app.context"
import { useTranslation } from "react-i18next"
import { openExternal } from "@/lib/open-external"

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  )
}

export function SidebarTool() {
  const { t } = useTranslation()
  const { selectedTab, setSelectedTab, selectedDb } = useAppContext()
  return (
    <SidebarDock>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <div>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <LayersIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{configs.app.name}</span>
                  <span className="truncate text-xs">{configs.app.desc}</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{ children: t("connections"), hidden: false }}
                  onClick={() => setSelectedTab("/connections")}
                  isActive={selectedTab === "/connections"}
                  className="px-2.5 md:px-2"
                >
                  <DatabaseIcon />
                  <span>{t("connections")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {selectedDb && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: "Browser", hidden: false }}
                    onClick={() => setSelectedTab("/browser")}
                    isActive={selectedTab === "/browser"}
                    className="px-2.5 md:px-2"
                  >
                    <ServerIcon />
                    <span>{t("browser")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {[
            { title: "Github", icon: <GithubIcon />, url: "https://github.com/tradalab/redishub" },
            { title: t("report_issues"), icon: <BugIcon />, url: "https://github.com/tradalab/redishub/issues" },
            { title: t("documentation"), icon: <BookOpenIcon />, url: "https://redishub.tradalab.com/" },
          ].map((item, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuButton
                className="px-2.5 md:px-2"
                tooltip={{ children: item.title, hidden: false }}
                onClick={e => {
                  e.preventDefault()
                  openExternal(item.url)
                }}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SettingDialog>
              <SidebarMenuButton tooltip={{ children: t("settings"), hidden: false }} className="px-2.5 md:px-2">
                <SettingsIcon />
                <span>{t("settings")}</span>
              </SidebarMenuButton>
            </SettingDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarDock>
  )
}
