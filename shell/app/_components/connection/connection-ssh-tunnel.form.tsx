"use client"

import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@tradalab/lyra/ui"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { Switch } from "@tradalab/lyra/ui"
import { SshReq as SshDO } from "@/types"
import { useSsh } from "@/app/_components/ssh/ssh.context"
import { useSshList } from "@/hooks/api/ssh.api"

export function ConnectionSshTunnelForm({ form }: { form: UseFormReturn<any> }) {
  const { t } = useTranslation()
  const ssh = useSsh()
  const { data: sshList = [] } = useSshList()

  const enabled = form.watch("ssh_enable")

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="ssh_enable"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <FormLabel>{t("enable_ssh_tunnel")}</FormLabel>
              <p className="text-xs text-muted-foreground">{t("enable_ssh_tunnel_desc")}</p>
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
          name="ssh_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("ssh_configuration")}</FormLabel>
              <div className="flex gap-1">
                <FormControl>
                  <Select value={field.value || "none"} onValueChange={val => field.onChange(val === "none" ? "" : val)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("ssh_configuration")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("none")}</SelectItem>
                      {sshList?.map((ssh: SshDO) => (
                        <SelectItem key={ssh.id} value={ssh.id}>
                          {ssh.username}@{ssh.host}:{ssh.port}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>

                <Button type="button" size="icon" variant="outline" onClick={() => ssh.open?.()}>
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
