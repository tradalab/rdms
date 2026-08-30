"use client"

import { useEffect, forwardRef, useImperativeHandle, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Input, toast } from "@tradalab/lyra/ui"
import { Textarea } from "@tradalab/lyra/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { SshReq as SshDO } from "@/types"
import { SshKindEnum } from "@/types/ssh-kind.enum"
import { useDeleteSsh, useTestSsh, useUpsertSsh } from "@/hooks/api/ssh.api"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

export interface PendingState {
  save: boolean
  test: boolean
  delete: boolean
}

export interface SshFormRef {
  submit: () => Promise<void>
  testConn: () => Promise<void>
  handleDelete: () => Promise<void>
}

interface Props {
  ssh: Partial<SshDO>
  onPendingChange?: (pending: PendingState) => void
  onSaved?: () => void
  onDeleted?: () => void
}

export const SshForm = forwardRef<SshFormRef, Props>(({ ssh, onPendingChange, onSaved, onDeleted }, ref) => {
  const { t } = useTranslation()
  const editing = !!ssh.id
  const secretPlaceholder = editing ? t("secret_keep_hint") : undefined

  const defaultValues = useMemo(
    () => ({
      id: ssh.id,
      host: ssh.host ?? "",
      port: ssh.port ?? 22,
      timeout: ssh.timeout ?? 60,
      username: ssh.username ?? "",
      kind: (ssh.kind as SshKindEnum) ?? SshKindEnum.PASSWORD,
      password: ssh.password ?? "",
      private_key: ssh.private_key ?? "",
      passphrase: ssh.passphrase ?? "",
    }),
    [ssh]
  )

  const sshSchema = z.object({
    id: z.string().optional(),
    host: z.string().min(1),
    port: z.number(),
    timeout: z.number(),
    username: z.string(),
    kind: z.nativeEnum(SshKindEnum),
    password: z.string().optional(),
    private_key: z.string().optional(),
    passphrase: z.string().optional(),
  })

  type SshFormValues = z.infer<typeof sshSchema>

  const form = useForm<SshFormValues>({
    defaultValues: defaultValues,
    resolver: zodResolver(sshSchema),
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const upsertSsh = useUpsertSsh()
  const deleteSsh = useDeleteSsh()
  const testSsh = useTestSsh()

  const kind = form.watch("kind")

  const pending: PendingState = {
    save: upsertSsh.isPending,
    test: testSsh.isPending,
    delete: deleteSsh.isPending,
  }

  useEffect(() => {
    onPendingChange?.(pending)
  }, [pending.save, pending.test, pending.delete, onPendingChange])

  const submit = form.handleSubmit(
    async values => {
      try {
        await upsertSsh.mutateAsync(values)
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

  const testConn = form.handleSubmit(async values => {
    try {
      await testSsh.mutateAsync(values)
      toast.add({ title: t("conn_success"), type: "success" })
    } catch (e) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : ""
      toast.add({ title: t("conn_failed"), description: msg, type: "error" })
    }
  })

  const handleDelete = async () => {
    if (!ssh?.id) return
    try {
      await deleteSsh.mutateAsync(ssh.id)
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
      testConn,
      handleDelete,
    }),
    [submit, testConn, handleDelete]
  )

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("host")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("port")}</FormLabel>
              <FormControl>
                <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timeout"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timeout (s)</FormLabel>
              <FormControl>
                <Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("username")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth_type")}</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SshKindEnum.PASSWORD}>{t("password")}</SelectItem>
                    <SelectItem value={SshKindEnum.KEYPAIR}>Keypair</SelectItem>
                    <SelectItem value={SshKindEnum.AGENT}>SSH Agent</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {kind === SshKindEnum.PASSWORD && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} type="password" placeholder={secretPlaceholder} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {kind === SshKindEnum.KEYPAIR && (
          <>
            <FormField
              control={form.control}
              name="private_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("private_key")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      className="font-mono text-xs min-h-[120px]"
                      placeholder={editing ? t("secret_keep_hint") : t("enter_private_key_pem")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passphrase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passphrase")}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="password" placeholder={secretPlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </form>
    </Form>
  )
})
