"use client"

import "@xterm/xterm/css/xterm.css"
import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@tradalab/lyra/ui"
import { client } from "@/api"
import { useTranslation } from "react-i18next"
import { useTheme } from "next-themes"
import { defaultEngine } from "@/lib/command/engine"
import { confirmDangerousMiddleware } from "@/lib/command/middleware/dangerous-command"
import { readOnlyMiddleware } from "@/lib/command/middleware/read-only"
import { CommandRegistry } from "@/lib/command/registry"
import { useCommandStore } from "@/stores/command.store"
import { useReadOnly } from "@/hooks/api/connection.api"
import { CommandContext } from "@/lib/command/types"
import { cn } from "@/lib/utils"

let middlewareRegistered = false
if (!middlewareRegistered) {
  defaultEngine.use(readOnlyMiddleware)
  defaultEngine.use(confirmDangerousMiddleware)
  middlewareRegistered = true
}

const XTERM_THEMES = {
  dark: {
    background: "#0a0a0a",
    foreground: "#e5e5e5",
    cursor: "#22c55e",
    selection: "#262626",
    black: "#000000",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
    blue: "#3b82f6",
    magenta: "#a855f7",
    cyan: "#06b6d4",
    white: "#e5e5e5",
  },
  light: {
    background: "#ffffff",
    foreground: "#171717",
    cursor: "#16a34a",
    selection: "#e5e7eb",
    black: "#000000",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#ca8a04",
    blue: "#2563eb",
    magenta: "#9333ea",
    cyan: "#0891b2",
    white: "#171717",
  },
}

interface Suggestion {
  type: "command" | "key"
  value: string
  description?: string
}

export function ConnectionDetailTabConsole({ connectionId, databaseIdx }: { connectionId: string; databaseIdx: number }) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()

  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")

  const { addHistory, getHistoryForConnection } = useCommandStore()

  const readOnly = useReadOnly(connectionId)
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly

  const [acState, setAcState] = useState({ open: false, x: 0, y: 0, direction: "down" as "up" | "down", query: "", index: 0, list: [] as Suggestion[] })
  const acRef = useRef(acState)
  const updateAc = (partial: Partial<typeof acState>) => {
    acRef.current = { ...acRef.current, ...partial }
    setAcState(acRef.current)
  }
  const bufferRef = useRef("")
  const replaceInputRef = useRef<((text: string) => void) | null>(null)

  useEffect(() => {
    let fitAddon: any
    let buffer = ""
    let debounceTimer: any
    let disposed = false
    let term: any = null

    let isExecuting = false
    const currentHistory = getHistoryForConnection(connectionId, databaseIdx)
      .map(h => h.command)
      .reverse()
    let historyIndex = currentHistory.length

    const prompt = `db${databaseIdx}> `
    const termPrompt = () => {
      termRef.current?.write(prompt)
    }

    const replaceInput = (text: string) => {
      termRef.current?.write("\x1b[2K\r")
      termPrompt()

      buffer = text
      bufferRef.current = buffer

      const parts = text.split(" ")
      if (parts.length > 0 && parts[0]) {
        const cmdName = parts[0].toUpperCase()
        if (CommandRegistry[cmdName]) {
          termRef.current.write(`\x1b[32m${parts[0]}\x1b[0m` + (parts.length > 1 ? " " + parts.slice(1).join(" ") : ""))
        } else {
          termRef.current.write(text)
        }
      } else {
        termRef.current.write(text)
      }
    }
    replaceInputRef.current = replaceInput

    const getCursorPos = () => {
      const cursor = terminalRef.current?.querySelector(".xterm-cursor")
      if (!cursor || !terminalRef.current) return { x: 0, y: 0, direction: "down" as "up" | "down" }
      const rect = cursor.getBoundingClientRect()
      const containerRect = terminalRef.current.getBoundingClientRect()

      const spaceBelow = containerRect.bottom - rect.bottom
      const spaceAbove = rect.top - containerRect.top

      let direction: "up" | "down" = "down"
      let y = rect.bottom - containerRect.top + 4

      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        direction = "up"
        y = containerRect.bottom - rect.top + 4
      }

      return { x: rect.left - containerRect.left, y, direction }
    }

    const fetchSuggestions = async (buf: string) => {
      if (!buf.trim()) {
        updateAc({ open: false })
        return
      }

      const parts = buf.trimStart().split(/\s+/)
      const isTrailingSpace = buf.endsWith(" ")

      const currentWordIndex = isTrailingSpace ? parts.length : parts.length - 1
      const query = isTrailingSpace ? "" : parts[currentWordIndex]

      const pos = getCursorPos()

      if (currentWordIndex === 0) {
        const q = query.toUpperCase()
        const list = Object.keys(CommandRegistry)
          .filter(k => k.startsWith(q))
          .sort()
          .map(k => ({ value: k, type: "command" as const, description: CommandRegistry[k].summary }))

        updateAc({ open: list.length > 0, x: pos.x, y: pos.y, direction: pos.direction, query: q, list, index: 0 })
      } else if (currentWordIndex >= 1) {
        if (query.length < 1) {
          updateAc({ open: false })
          return
        }

        try {
          const { keys } = await client.searchKeys({
            connection_id: connectionId,
            database_index: databaseIdx,
            prefix: query,
            count: 20,
            cursor: "",
          })
          const list = (keys || []).map(k => ({ value: k, type: "key" as const }))
          updateAc({ open: list.length > 0, x: pos.x, y: pos.y, direction: pos.direction, query, list, index: 0 })
        } catch (e) {
          updateAc({ open: false })
        }
      }
    }

    const handleCommand = async (cmdString: string) => {
      isExecuting = true
      try {
        if (!cmdString.trim()) {
          await termRef.current?.write("\r\n")
          return
        }

        const parts = cmdString.trim().split(/\s+/)
        const commandName = parts[0].toUpperCase()

        if (commandName === "CLEAR") {
          termRef.current?.clear()
          termRef.current?.write("\x1bc")
          return
        }

        if (commandName === "HELP") {
          await termRef.current?.write("\r\n")
          await termRef.current?.writeln("RedisHub Console Help")
          await termRef.current?.writeln("Available client commands:")
          await termRef.current?.writeln("  CLEAR   - Clear the console screen")
          await termRef.current?.writeln("  HELP    - Show this help message")
          await termRef.current?.writeln("  HISTORY - Show command history")
          await termRef.current?.writeln("")
          await termRef.current?.writeln("For a full list of Redis commands, see https://redis.io/commands")
          return
        }

        if (commandName === "HISTORY") {
          await termRef.current?.write("\r\n")
          if (currentHistory.length === 0) {
            await termRef.current?.writeln("No history available.")
          } else {
            currentHistory.forEach((cmd, idx) => {
              termRef.current?.writeln(`  ${(idx + 1).toString().padStart(4, " ")}  ${cmd}`)
            })
          }
          return
        }

        const ctx: CommandContext = {
          id: crypto.randomUUID(),
          raw: cmdString,
          parsed: {
            name: commandName,
            args: parts.slice(1),
          },
          connectionId,
          databaseIdx,
          readOnly: readOnlyRef.current,
        }

        const res = await defaultEngine.execute(ctx)
        await termRef.current?.write("\r\n")

        if (res.status === "error") {
          await termRef.current?.writeln(res.stderr || "Unknown error")
        } else if (res.status === "cancelled") {
          await termRef.current?.writeln(`\x1b[33m(cancelled)\x1b[0m`)
        } else {
          if (res.stdout) {
            await termRef.current?.writeln(res.stdout)
          }
          addHistory({
            command: cmdString,
            connectionId,
            databaseIdx,
          })
          currentHistory.push(cmdString)
          historyIndex = currentHistory.length
        }
      } catch (err: any) {
        await termRef.current?.write("\r\n")
        await termRef.current?.writeln(`\x1b[31m(error)\x1b[0m ${err?.message}`)
      } finally {
        termPrompt()
        isExecuting = false
      }
    }

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm")
      const { FitAddon } = await import("@xterm/addon-fit")
      if (disposed) return

      term = new Terminal({
        cursorBlink: true,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        theme: resolvedTheme === "light" ? XTERM_THEMES.light : XTERM_THEMES.dark,
        scrollOnUserInput: true,
      })

      termRef.current = term

      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current!)
      fitAddon.fit()

      try {
        await client.consoleConnect({ connection_id: connectionId, database_index: databaseIdx })
        if (disposed) return
        term?.writeln("\x1b[32mRedis Console Ready\x1b[0m")
        termPrompt()
        setStatus("connected")
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        term.writeln(`\x1b[31m(error)\x1b[0m ${msg}`)
        setStatus("error")
        return
      }

      term.attachCustomKeyEventHandler((arg: KeyboardEvent) => {
        if (arg.keyCode === 9 && arg.type === "keydown") {
          arg.preventDefault()
          if (acRef.current.open && acRef.current.list.length > 0) {
            const selected = acRef.current.list[acRef.current.index]
            const parts = buffer.trimStart().split(/\s+/)
            const isTrailingSpace = buffer.endsWith(" ")
            if (!isTrailingSpace) {
              parts.pop()
            }
            parts.push(selected.value)

            const prefix = buffer.length - buffer.trimStart().length
            replaceInput(" ".repeat(prefix) + parts.join(" ") + " ")
            updateAc({ open: false })
            return false
          }
          return false
        }
        return true
      })

      term.onData((data: string) => {
        if (isExecuting) return

        const code = data.charCodeAt(0)

        if (code === 27 && data === "\u001b") {
          if (acRef.current.open) {
            updateAc({ open: false })
            return
          }
        }

        if (code === 27 && data === "\u001b[A") {
          if (acRef.current.open) {
            const newIndex = Math.max(0, acRef.current.index - 1)
            updateAc({ index: newIndex })
            document.getElementById(`ac-item-${newIndex}`)?.scrollIntoView({ block: "nearest" })
            return
          }
          if (!currentHistory.length) return
          if (historyIndex > 0) historyIndex--
          replaceInput(currentHistory[historyIndex])
          updateAc({ open: false })
          return
        }

        if (code === 27 && data === "\u001b[B") {
          if (acRef.current.open) {
            const newIndex = Math.min(acRef.current.list.length - 1, acRef.current.index + 1)
            updateAc({ index: newIndex })
            document.getElementById(`ac-item-${newIndex}`)?.scrollIntoView({ block: "nearest" })
            return
          }
          if (!currentHistory.length) return
          if (historyIndex < currentHistory.length - 1) {
            historyIndex++
            replaceInput(currentHistory[historyIndex])
          } else {
            historyIndex = currentHistory.length
            replaceInput("")
          }
          updateAc({ open: false })
          return
        }

        if (code === 13) {
          if (acRef.current.open && acRef.current.list.length > 0) {
            const selected = acRef.current.list[acRef.current.index]
            const parts = buffer.trimStart().split(/\s+/)
            const isTrailingSpace = buffer.endsWith(" ")
            if (!isTrailingSpace) {
              parts.pop()
            }
            parts.push(selected.value)

            const prefix = buffer.length - buffer.trimStart().length
            replaceInput(" ".repeat(prefix) + parts.join(" ") + " ")
            updateAc({ open: false })
            return
          }

          const cmd = buffer
          buffer = ""
          bufferRef.current = ""
          updateAc({ open: false })
          handleCommand(cmd)
          return
        }

        if (code === 127) {
          if (buffer.length > 0) {
            const newBuf = Array.from(buffer).slice(0, -1).join("")
            if (replaceInputRef.current) {
              replaceInputRef.current(newBuf)
            } else {
              buffer = newBuf
              bufferRef.current = buffer
              term.write("\b \b")
            }

            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => fetchSuggestions(buffer), 100)
          }
          return
        }

        if (data.startsWith("\x1b")) return
        if (code < 32) return

        const printable = data.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        if (!printable) return

        buffer += printable
        bufferRef.current = buffer
        term.write(printable)

        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => fetchSuggestions(buffer), 100)
      })

      const handleResize = () => {
        fitAddon.fit()
        updateAc({ open: false })
      }
      window.addEventListener("resize", handleResize)

      return () => window.removeEventListener("resize", handleResize)
    }

    initTerminal()

    return () => {
      disposed = true
      clearTimeout(debounceTimer)
      term?.dispose()
      termRef.current = null
    }
  }, [connectionId, databaseIdx, t, resolvedTheme])

  useEffect(() => {
    if (!termRef.current) return
    if (!resolvedTheme) return

    termRef.current.options.theme = resolvedTheme === "light" ? XTERM_THEMES.light : XTERM_THEMES.dark
    termRef.current.refresh(0, termRef.current.rows - 1)
  }, [resolvedTheme])

  return (
    <Card className="w-full h-full border bg-background py-2">
      <CardContent className="relative w-full h-full p-0">
        <div ref={terminalRef} className="w-full h-full px-2 pt-2" />
        <div className="absolute top-2 right-6 text-xs font-mono text-muted-foreground">Redis CLI {status === "connected" ? "🟢" : "🔴"}</div>

        {acState.open && acState.list.length > 0 && (
          <div
            className="absolute z-50 bg-popover text-popover-foreground border shadow-md rounded-md overflow-hidden max-h-[250px] flex flex-col"
            style={{
              left: acState.x,
              ...(acState.direction === "up" ? { bottom: acState.y } : { top: acState.y }),
              minWidth: "250px",
            }}
          >
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
              {acState.list.map((s, i) => (
                <div
                  key={i}
                  id={`ac-item-${i}`}
                  className={cn(
                    "px-3 py-1.5 text-sm flex justify-between items-center cursor-pointer",
                    i === acState.index ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground"
                  )}
                  onClick={() => {
                    if (replaceInputRef.current) {
                      const buf = bufferRef.current
                      const parts = buf.trimStart().split(/\s+/)
                      const isTrailingSpace = buf.endsWith(" ")
                      if (!isTrailingSpace) {
                        parts.pop()
                      }
                      parts.push(s.value)

                      const prefix = buf.length - buf.trimStart().length
                      replaceInputRef.current(" ".repeat(prefix) + parts.join(" ") + " ")
                      updateAc({ open: false })
                      termRef.current?.focus()
                    }
                  }}
                >
                  <span className="font-mono text-foreground font-medium">{s.value}</span>
                  {s.description && <span className="text-xs opacity-70 ml-4 truncate max-w-[150px]">{s.description}</span>}
                </div>
              ))}
            </div>
            <div className="bg-muted px-2 py-1 text-[10px] text-muted-foreground border-t flex justify-between">
              <span>
                {t("console_hint_use")} <kbd className="font-sans px-1 bg-background rounded border">↑</kbd>{" "}
                <kbd className="font-sans px-1 bg-background rounded border">↓</kbd> {t("console_hint_navigate")}
              </span>
              <span>
                <kbd className="font-sans px-1 bg-background rounded border">Tab</kbd> {t("console_hint_select")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
