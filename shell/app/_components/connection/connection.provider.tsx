"use client"

import { ReactNode, useState } from "react"
import { ConnectionContext } from "./connection.context"
import { ConnectionDialog } from "./connection.dialog"
import { ConnectionReq as ConnectionDO } from "@/types"
import { RedisModeEnum } from "@/types/redis-mode.enum"

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [connection, setConnection] = useState<Partial<ConnectionDO> | null>(null)

  const handleCreate = () => {
    setConnection({
      name: "",
      group_id: "",
      network: "tcp",
      host: "127.0.0.1",
      port: 6379,
      sock: "/tmp/redis.sock",
      username: "",
      password: "",
      exec_timeout: 60,
      dial_timeout: 60,
      key_size: 10000,
      proxy_id: "",
      proxy_enable: false,
      ssh_id: "",
      ssh_enable: false,
      tls_id: "",
      tls_enable: false,
      read_only: false,
      mode: RedisModeEnum.STANDALONE,
    })
    setOpen(true)
  }

  const handleEdit = (conn: ConnectionDO) => {
    setConnection({ ...conn, proxy_enable: Boolean(conn.proxy_enable), ssh_enable: Boolean(conn.ssh_enable), tls_enable: Boolean(conn.tls_enable) })
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setConnection(null)
  }

  return (
    <ConnectionContext.Provider
      value={{
        create: handleCreate,
        edit: handleEdit,
        close: handleClose,
      }}
    >
      {children}
      <ConnectionDialog open={open} onOpenChange={setOpen} connection={connection} />
    </ConnectionContext.Provider>
  )
}
