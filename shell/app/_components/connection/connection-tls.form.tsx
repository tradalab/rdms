"use client"

import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@tradalab/lyra/ui"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { Switch } from "@tradalab/lyra/ui"
import { TlsReq as TlsDO } from "@/types"
import { useTlsList } from "@/hooks/api/tls.api"
import { useTls } from "@/app/_components/tls/tls.context"

export function ConnectionTlsForm({ form }: { form: UseFormReturn<any> }) {
  const { t } = useTranslation()
  const { data: tlsList = [] } = useTlsList()
  const tls = useTls()

  const enabled = form.watch("tls_enable")

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="tls_enable"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <FormLabel>{t("enable_tls")}</FormLabel>
              <p className="text-xs text-muted-foreground">{t("enable_tls_desc")}</p>
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
          name="tls_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tls_configuration")}</FormLabel>
              <div className="flex gap-1">
                <FormControl>
                  <Select value={field.value || "none"} onValueChange={val => field.onChange(val === "none" ? "" : val)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("tls_configuration")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("none")}</SelectItem>
                      {tlsList?.map((tlsDO: TlsDO) => (
                        <SelectItem key={tlsDO.id} value={tlsDO.id}>
                          {tlsDO.name || tlsDO.server_name || tlsDO.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>

                <Button type="button" size="icon" variant="outline" onClick={() => tls.open?.()}>
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
