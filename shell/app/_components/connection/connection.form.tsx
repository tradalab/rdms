"use client"

import { useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "@tradalab/lyra/ui"
import { Form } from "@tradalab/lyra/blocks"
import { useTranslation } from "react-i18next"

import { Panel } from "@tradalab/lyra/blocks"
import { ConnectionGeneralForm } from "@/app/_components/connection/connection-general.form"
import { ConnectionSshTunnelForm } from "@/app/_components/connection/connection-ssh-tunnel.form"
import { ConnectionTlsForm } from "@/app/_components/connection/connection-tls.form"
import { ConnectionOptionalForm } from "@/app/_components/connection/connection-optional.form"
import { ConnectionProxyForm } from "@/app/_components/connection/connection-proxy.form"
import { ConnectionReq as ConnectionDO } from "@/types"
import { RedisModeEnum } from "@/types/redis-mode.enum"
import { useTestConnection, useUpsertConnection } from "@/hooks/api/connection.api"

const connectionSchema = z
  .object({
    id: z.string().optional(),
    group_id: z.string().optional().nullable(),
    mode: z.nativeEnum(RedisModeEnum),
    name: z.string().min(1, "Name is required"),
    network: z.string().default("tcp"),
    host: z.string().optional().nullable(),
    port: z.preprocess(val => (val === "" ? undefined : val), z.coerce.number().min(1).max(65535).optional()),
    addrs: z.string().optional().nullable(),
    sentinel_master: z.string().optional().nullable(),
    sentinel_username: z.string().optional().nullable(),
    sentinel_password: z.string().optional().nullable(),
    sock: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    addr_mapping: z.string().optional().nullable(),
    last_db: z.preprocess(val => (val === "" ? undefined : val), z.coerce.number().optional()),
    exec_timeout: z.preprocess(val => (val === "" ? undefined : val), z.coerce.number().min(0).optional()),
    dial_timeout: z.preprocess(val => (val === "" ? undefined : val), z.coerce.number().min(0).optional()),
    key_size: z.preprocess(val => (val === "" ? undefined : val), z.coerce.number().min(0).optional()),
    ssh_enable: z.boolean().default(false),
    ssh_id: z.string().nullish(),
    proxy_enable: z.boolean().default(false),
    proxy_id: z.string().nullish(),
    tls_enable: z.boolean().default(false),
    tls_id: z.string().nullish(),
    read_only: z.boolean().default(false),
  })
  .refine(
    data => {
      if (data.mode === RedisModeEnum.STANDALONE && data.network === "tcp") {
        return !!data.host
      }
      return true
    },
    {
      message: "Host is required for TCP standalone",
      path: ["host"],
    }
  )
  .refine(
    data => {
      if (data.mode === RedisModeEnum.SENTINEL) {
        return !!data.sentinel_master
      }
      return true
    },
    {
      message: "Master Group Name is required",
      path: ["sentinel_master"],
    }
  )
  .refine(
    data => {
      if (data.mode === RedisModeEnum.SENTINEL || data.mode === RedisModeEnum.CLUSTER) {
        return !!data.addrs
      }
      return true
    },
    {
      message: "Addresses are required",
      path: ["addrs"],
    }
  )
  .refine(
    data => {
      if ((data.mode === RedisModeEnum.SENTINEL || data.mode === RedisModeEnum.CLUSTER) && data.addrs) {
        const lines = data.addrs
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean)
        return lines.every(line => {
          const parts = line.split(":")
          if (parts.length !== 2) return false
          const port = parseInt(parts[1])
          return !isNaN(port) && port > 0 && port <= 65535
        })
      }
      return true
    },
    {
      message: "Each address must be in host:port format",
      path: ["addrs"],
    }
  )
  .refine(
    data => {
      if (data.ssh_enable) {
        return !!data.ssh_id
      }
      return true
    },
    {
      message: "SSH configuration is required",
      path: ["ssh_id"],
    }
  )
  .refine(
    data => {
      if (data.proxy_enable) {
        return !!data.proxy_id
      }
      return true
    },
    {
      message: "Proxy configuration is required",
      path: ["proxy_id"],
    }
  )
  .refine(
    data => {
      if (data.tls_enable) {
        return !!data.tls_id
      }
      return true
    },
    {
      message: "TLS configuration is required",
      path: ["tls_id"],
    }
  )

type FormValues = z.input<typeof connectionSchema>
type FormOutput = z.output<typeof connectionSchema>

export interface PendingState {
  save: boolean
  test: boolean
}

export interface ConnectionFormRef {
  submit: () => Promise<boolean>
  testConn: () => Promise<void>
}

interface Props {
  connection?: Partial<ConnectionDO>
  onPendingChange?: (p: PendingState) => void
}

export const ConnectionForm = forwardRef<ConnectionFormRef, Props>(({ connection, onPendingChange }, ref) => {
  const { t } = useTranslation()

  const { mode, ...rest } = connection || {}

  const form = useForm<FormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      network: "tcp",
      port: 6379,
      exec_timeout: 60,
      dial_timeout: 60,
      key_size: 10000,
      proxy_enable: false,
      ssh_enable: false,
      tls_enable: false,
      ...rest,
      mode: (mode as RedisModeEnum) || RedisModeEnum.STANDALONE,
    } as any,
  })

  const upsertConnection = useUpsertConnection()
  const testConnection = useTestConnection()

  useEffect(() => {
    const { mode, ...rest } = connection || {}
    form.reset({
      proxy_enable: false,
      ssh_enable: false,
      tls_enable: false,
      ...rest,
      mode: (mode as RedisModeEnum) || RedisModeEnum.STANDALONE,
    })
  }, [connection, form])

  useEffect(() => {
    onPendingChange?.({
      save: upsertConnection.isPending,
      test: testConnection.isPending,
    })
  }, [upsertConnection.isPending, testConnection.isPending, onPendingChange])

  const submit = useCallback(
    () =>
      new Promise<boolean>(resolve => {
        form.handleSubmit(
          async values => {
            const data = values as FormOutput
            try {
              await upsertConnection.mutateAsync(data as any)
              toast.add({ title: t("saved"), type: "success" })
              resolve(true)
            } catch (e: any) {
              toast.add({ title: e?.message ?? t("unknown_error"), type: "error" })
              resolve(false)
            }
          },
          () => resolve(false)
        )()
      }),
    [form, t, upsertConnection]
  )

  const testConn = useCallback(
    () =>
      form.handleSubmit(async values => {
        const data = values as FormOutput
        try {
          await testConnection.mutateAsync(data as any)
          toast.add({ title: t("conn_success"), type: "success" })
        } catch (e: any) {
          const msg = e instanceof Error ? e.message : typeof e === "string" ? e : ""
          toast.add({ title: t("conn_failed"), description: msg, type: "error" })
        }
      })(),
    [form, t, testConnection]
  )

  useImperativeHandle(
    ref,
    () => ({
      submit,
      testConn,
    }),
    [submit, testConn]
  )

  const { errors } = form.formState

  const hasGeneralError = Object.keys(errors).some(key =>
    [
      "name",
      "mode",
      "group_id",
      "network",
      "host",
      "port",
      "sock",
      "sentinel_master",
      "addrs",
      "sentinel_username",
      "sentinel_password",
      "username",
      "password",
      "last_db",
    ].includes(key)
  )
  const hasOptionalError = Object.keys(errors).some(key => ["exec_timeout", "dial_timeout", "key_size"].includes(key))
  const hasTlsError = Object.keys(errors).some(key => ["tls_enable", "tls_id"].includes(key))
  const hasSshError = Object.keys(errors).some(key => ["ssh_enable", "ssh_id"].includes(key))
  const hasProxyError = Object.keys(errors).some(key => ["proxy_enable", "proxy_id"].includes(key))

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-hidden px-0 py-0 min-h-0">
          <Panel
            items={[
              {
                key: "conn-general-form",
                label: t("general"),
                hasError: hasGeneralError,
                content: <ConnectionGeneralForm form={form} />,
              },
              {
                key: "conn-optional-form",
                label: t("optional"),
                hasError: hasOptionalError,
                content: <ConnectionOptionalForm form={form} />,
              },
              {
                key: "conn-proxy-form",
                label: t("proxy"),
                hasError: hasProxyError,
                content: <ConnectionProxyForm form={form} />,
              },
              {
                key: "conn-tls-form",
                label: "TLS/SSL",
                hasError: hasTlsError,
                content: <ConnectionTlsForm form={form} />,
              },
              {
                key: "conn-ssh-tunnel-form",
                label: t("ssh_tunnel"),
                hasError: hasSshError,
                content: <ConnectionSshTunnelForm form={form} />,
              },
            ]}
          />
        </div>
      </form>
    </Form>
  )
})
