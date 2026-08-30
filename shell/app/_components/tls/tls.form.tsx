"use client"

import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Input, toast } from "@tradalab/lyra/ui"
import { Textarea } from "@tradalab/lyra/ui"
import { Switch } from "@tradalab/lyra/ui"
import { TlsReq as TlsDO } from "@/types"
import { useDeleteTls, useUpsertTls } from "@/hooks/api/tls.api"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"

export interface PendingState {
  save: boolean
  delete: boolean
}

export interface TlsFormRef {
  submit: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface Props {
  tls: Partial<TlsDO>
  onPendingChange?: (pending: PendingState) => void
  onSaved?: () => void
  onDeleted?: () => void
}

export const TlsForm = forwardRef<TlsFormRef, Props>(({ tls, onPendingChange, onSaved, onDeleted }, ref) => {
  const { t } = useTranslation()
  const editing = !!tls.id

  const tlsSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    use_sni: z.boolean(),
    server_name: z.string().optional(),
    verify: z.boolean(),
    client_auth: z.boolean(),
    ca_cert: z.string().optional(),
    cert: z.string().optional(),
    key: z.string().optional(),
  })

  type TlsFormValues = z.infer<typeof tlsSchema>

  const defaultValues = useMemo(
    () => ({
      id: tls.id,
      name: tls.name || "",
      use_sni: Boolean(tls.use_sni),
      server_name: tls.server_name || "",
      verify: typeof tls.verify === "boolean" ? tls.verify : true,
      client_auth: Boolean(tls.client_auth),
      ca_cert: tls.ca_cert || "",
      cert: tls.cert || "",
      key: tls.key || "",
    }),
    [tls]
  )

  const form = useForm<TlsFormValues>({
    defaultValues: defaultValues,
    resolver: zodResolver(tlsSchema),
  })

  const upsertTls = useUpsertTls()
  const deleteTls = useDeleteTls()

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const pending: PendingState = {
    save: upsertTls.isPending,
    delete: deleteTls.isPending,
  }

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, pending.delete, onPendingChange])

  const submit = form.handleSubmit(
    async values => {
      try {
        await upsertTls.mutateAsync(values as Partial<TlsDO>)
        toast.add({ title: t("saved"), type: "success" })
        onSaved?.()
      } catch (e: any) {
        toast.add({ title: e?.message ?? t("unknown_error"), type: "error" })
      }
    },
    errors => {
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast.add({ title: `${t("validation_error")}: ${firstError.message}`, type: "error" })
      }
    }
  )

  const handleDelete = async () => {
    if (!tls?.id) return
    try {
      await deleteTls.mutateAsync(tls.id)
      toast.add({ title: t("deleted"), type: "success" })
      onDeleted?.()
    } catch (e: any) {
      toast.add({ title: e?.message ?? t("unknown_error"), type: "error" })
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      submit,
      handleDelete,
    }),
    [submit, handleDelete]
  )

  const verify = form.watch("verify")
  const useSni = form.watch("use_sni")
  const clientAuth = form.watch("client_auth")

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-6 pb-4">
        {/* Basic Information */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")} (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. My Secure Redis" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Server & Certificates Configuration */}
        <div className="border rounded-lg p-4 space-y-6">
          <FormField
            control={form.control}
            name="verify"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>{t("verify_tls")}</FormLabel>
                  <p className="text-xs text-muted-foreground">{t("verify_tls_desc")}</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <hr className="border-border" />

          <FormField
            control={form.control}
            name="use_sni"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>{t("use_sni")}</FormLabel>
                  <p className="text-xs text-muted-foreground">{t("use_sni_desc")}</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {(useSni || verify) && (
            <div className="pt-2">
              <FormField
                control={form.control}
                name="server_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("server_ca_name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. redis.example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <hr className="border-border" />

          <div className="pt-2">
            <FormField
              control={form.control}
              name="ca_cert"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("root_ca_cert")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                      className="font-mono text-xs whitespace-pre"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Client Authentication */}
        <div className="border rounded-lg p-4 space-y-6">
          <FormField
            control={form.control}
            name="client_auth"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <div>
                  <FormLabel>{t("client_auth")}</FormLabel>
                  <p className="text-xs text-muted-foreground">{t("client_auth_desc")}</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {clientAuth && (
            <>
              <hr className="border-border" />
              <div className="grid gap-6 pt-2">
                <FormField
                  control={form.control}
                  name="cert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client_cert")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={6}
                          placeholder={`-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----`}
                          className="font-mono text-xs whitespace-pre"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client_key")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={6}
                          placeholder={editing ? t("secret_keep_hint") : `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----`}
                          className="font-mono text-xs whitespace-pre"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>
      </form>
    </Form>
  )
})
