"use client"

import Editor, { EditorProps, OnMount, loader } from "@monaco-editor/react"
import React, { useRef, useCallback, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import type * as monaco from "monaco-editor"
import { debounce } from "lodash"
import { cn } from "@/lib/utils"

if (typeof window !== "undefined") {
  ;(window as unknown as { MonacoEnvironment?: { getWorkerUrl(): string } }).MonacoEnvironment = {
    getWorkerUrl: () => "/monaco-worker.js",
  }
  loader.config({
    paths: {
      vs: "/monaco-editor/vs",
    },
  })
}

type CodeEditorProps = EditorProps & {
  className?: string
  autoHeight?: boolean
  defaultHeight?: number | string
  autoFormat?: boolean
}

export function CodeEditor({ className, autoHeight = false, autoFormat = false, defaultHeight = 200, onMount, ...props }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const { theme, systemTheme } = useTheme()
  const [editorTheme, setEditorTheme] = useState("light")

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor

      if (autoHeight && containerRef.current) {
        const updateHeight = () => {
          const contentHeight = editor.getContentHeight() + 6 // trick
          containerRef.current!.style.height = `${contentHeight}px`
          editor.layout()
        }

        updateHeight()

        editor.onDidContentSizeChange(() => {
          updateHeight()
        })
      }

      onMount?.(editor, monaco)
    },
    [autoHeight, onMount]
  )

  useEffect(() => {
    const currentTheme = theme === "system" ? systemTheme : theme
    setEditorTheme(currentTheme === "dark" ? "vs-dark" : "light")
  }, [theme, systemTheme])

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current?.getAction("editor.action.formatDocument")?.run()
    }
  }

  const handleChange = debounce(() => formatCode(), 300)

  return (
    <div
      className={cn(
        "w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 focus:shadow focus:shadow-blue-300/30 outline-none py-3",
        className
      )}
    >
      <div
        ref={containerRef}
        style={{
          height: autoHeight ? undefined : typeof defaultHeight === "number" ? `${defaultHeight}px` : defaultHeight,
        }}
      >
        <Editor
          {...props}
          onMount={handleEditorMount}
          options={{
            scrollBeyondLastLine: false,
            ...props.options,
          }}
          theme={editorTheme}
          onChange={(value, ev) => {
            props?.onChange?.(value, ev)
            if (autoFormat) {
              handleChange()
            }
          }}
        />
      </div>
    </div>
  )
}
