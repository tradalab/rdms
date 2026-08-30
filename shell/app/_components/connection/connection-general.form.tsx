"use client"

import { UseFormReturn } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@tradalab/lyra/blocks"
import { Input } from "@tradalab/lyra/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { useGroupList } from "@/hooks/api/group.api"
import { Textarea } from "@tradalab/lyra/ui"
import { Separator } from "@tradalab/lyra/ui"
import { RedisModeEnum } from "@/types/redis-mode.enum"
import { GroupItem as GroupDO } from "@/types"

export function ConnectionGeneralForm({ form }: { form: UseFormReturn<any> }) {
  const { t } = useTranslation()
  const { data: groups = [] } = useGroupList()

  const mode: RedisModeEnum = form.watch("mode") || RedisModeEnum.STANDALONE
  const network: string = form.watch("network")
  const editing = !!form.watch("id")
  const secretPlaceholder = editing ? t("secret_keep_hint") : undefined

  return (
    <div className="space-y-6 px-1 py-1">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel className="flex items-center justify-between">{t("name")}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Project Alpha" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <div className="grid grid-cols-2 gap-4 items-start">
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("mode")}</FormLabel>
                  <FormControl>
                    <Select value={field.value || RedisModeEnum.STANDALONE} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={RedisModeEnum.STANDALONE}>{t("standalone")}</SelectItem>
                        <SelectItem value={RedisModeEnum.SENTINEL}>{t("sentinel")}</SelectItem>
                        <SelectItem value={RedisModeEnum.CLUSTER}>{t("cluster")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="group_id"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("group")}</FormLabel>
                  <FormControl>
                    <Select value={field.value || "none"} onValueChange={val => field.onChange(val === "none" ? null : val)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("none")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("none")}</SelectItem>
                        {groups?.map((e: GroupDO) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      </div>

      <Separator />

      {mode == "standalone" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("instance_settings")}</div>
          <FormField
            control={form.control}
            name="network"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("network")}</FormLabel>
                  <FormControl>
                    <Select value={field.value || "tcp"} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["tcp", "unix"].map(e => (
                          <SelectItem key={e} value={e}>
                            {e.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          {network == "tcp" && (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">{t("host")}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="127.0.0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">{t("port")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="text" placeholder="6379" onChange={e => field.onChange(e.target.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            </div>
          )}
          {network == "unix" && (
            <FormField
              control={form.control}
              name="sock"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">{t("sock")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="/tmp/redis.sock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          )}
        </div>
      )}

      {mode == "sentinel" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("sentinel_settings")}</div>
          <FormField
            control={form.control}
            name="sentinel_master"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("sentinel_master")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="mymaster" />
                  </FormControl>
                  <FormDescription className="text-[11px] leading-tight">{t("sentinel_master_help")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="addrs"
            render={({ field }) => {
              const host = form.getValues("host")
              const port = form.getValues("port")
              const canImport = host && port

              return (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addrs")}</FormLabel>
                    {canImport && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = field.value || ""
                          const newItem = `${host}:${port}`
                          if (!current.includes(newItem)) {
                            field.onChange(current ? `${current}\n${newItem}` : newItem)
                          }
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {t("import_from_standalone")}
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea {...field} placeholder={t("addrs_placeholder")} className="min-h-[80px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            <div className="text-[11px] font-medium text-muted-foreground mb-2 px-1">{t("sentinel_authentication")}</div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sentinel_username"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-[11px]">{t("sentinel_username")}</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="sentinel_password"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-[11px]">{t("sentinel_password")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} type="password" placeholder={secretPlaceholder} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1 opacity-70">{t("sentinel_auth_help")}</p>
          </div>
        </div>
      )}

      {mode == "cluster" && (
        <div className="space-y-4">
          <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("cluster_settings")}</div>
          <FormField
            control={form.control}
            name="addrs"
            render={({ field }) => {
              const host = form.getValues("host")
              const port = form.getValues("port")
              const canImport = host && port

              return (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addrs")}</FormLabel>
                    {canImport && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = field.value || ""
                          const newItem = `${host}:${port}`
                          if (!current.includes(newItem)) {
                            field.onChange(current ? `${current}\n${newItem}` : newItem)
                          }
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {t("import_from_standalone")}
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea {...field} placeholder={t("addrs_placeholder")} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{t("master_credentials")}</div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("master_username")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="default" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">{t("master_password")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="password" placeholder={secretPlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground leading-tight">{t("master_credentials_help")}</p>
      </div>
    </div>
  )
}
