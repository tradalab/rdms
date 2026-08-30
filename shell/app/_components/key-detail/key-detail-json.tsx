"use client"

import { useMemo, useState } from "react"
import { SaveIcon } from "lucide-react"
import { Button, Spinner, toast } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { CodeEditor } from "@/app/_components/code-editor"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { client } from "@/api"

export type KeyDetailJsonProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: string
  reload: () => void
  readOnly?: boolean
}

export function KeyDetailJson(props: KeyDetailJsonProps) {
  const { t } = useTranslation()
  const [changed, setChanged] = useState(false)
  const [newVal, setNewVal] = useState("")
  const [loading, setLoading] = useState(false)

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(props.data), null, 2)
    } catch {
      return props.data ?? ""
    }
  }, [props.data])

  const update = async () => {
    try {
      JSON.parse(newVal)
    } catch {
      toast.add({ title: t("invalid_json"), type: "error" })
      return
    }

    setLoading(true)
    await client
      .keyValueUpdate({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        kind: KeyKindEnum.JSON,
        value: newVal,
      })
      .then(() => {
        props.reload()
        toast.add({ title: t("updated"), type: "success" })
      })
      .catch(e => {
        const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
        toast.add({ title: msg, type: "error" })
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <>
      <div>
        <Button
          size="sm"
          variant="outline"
          className="mb-2"
          disabled={!changed || loading || props.readOnly}
          title={props.readOnly ? t("read_only_blocked") : undefined}
          onClick={() => update()}
        >
          {loading ? <Spinner /> : <SaveIcon />}
          {t("save")}
        </Button>
      </div>
      <CodeEditor
        value={pretty}
        language="json"
        defaultHeight={400}
        className="border-0 shadow-none"
        options={{ readOnly: loading || props.readOnly, minimap: { enabled: false } }}
        onChange={val => {
          if (!changed) {
            setChanged(true)
          }
          setNewVal(val ?? "")
        }}
      />
    </>
  )
}
