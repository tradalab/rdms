"use client"

import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@tradalab/lyra/ui"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { Switch } from "@tradalab/lyra/ui"
import { useProxy } from "@/app/_components/proxy/proxy.context"
import { ProxyReq as ProxyDO } from "@/types"
import { useProxyList } from "@/hooks/api/proxy.api"

export function ConnectionProxyForm({ form }: { form: UseFormReturn<any> }) {
  const { t } = useTranslation()
  const proxy = useProxy()
  const { data: proxyList = [] } = useProxyList()

  const enabled = form.watch("proxy_enable")

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="proxy_enable"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <FormLabel>{t("enable_proxy")}</FormLabel>
              <p className="text-xs text-muted-foreground">{t("enable_proxy_desc")}</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {!!enabled && (
        <FormField
          control={form.control}
          name="proxy_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("proxy_configuration")}</FormLabel>
              <div className="flex gap-1">
                <FormControl>
                  <Select value={field.value || "none"} onValueChange={val => field.onChange(val === "none" ? "" : val)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("proxy_configuration")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("none")}</SelectItem>
                      {proxyList?.map((p: ProxyDO) => (
                        <SelectItem key={p.id} value={p.id}>
                          [{p.protocol.toUpperCase()}] {p.host}:{p.port}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>

                <Button type="button" size="icon" variant="outline" onClick={() => proxy.open?.()}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
