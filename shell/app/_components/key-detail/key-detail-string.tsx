"use client"

import { useState } from "react"
import { SaveIcon } from "lucide-react"
import { Button, toast } from "@tradalab/lyra/ui"
import { CodeEditor } from "@/app/_components/code-editor"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { client } from "@/api"
import { useTranslation } from "react-i18next"
import { Spinner } from "@tradalab/lyra/ui"

export type KeyDetailStringProps = {
  databaseId: string
  databaseIdx: number
  selectedKey: string
  data: string
  reload: () => void
  readOnly?: boolean
}

export function KeyDetailString(props: KeyDetailStringProps) {
  const { t } = useTranslation()
  const [changed, setChanged] = useState<boolean>(false)
  const [newVal, setNewVal] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const update = async () => {
    setLoading(true)
    await client
      .keyValueUpdate({
        connection_id: props.databaseId,
        database_index: props.databaseIdx,
        key: props.selectedKey,
        kind: KeyKindEnum.STRING,
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
        value={props.data}
        language="txt"
        autoFormat={true}
        defaultHeight={400}
        className="border-0 shadow-none"
        options={{ readOnly: loading || props.readOnly, minimap: { enabled: false } }}
        onChange={val => {
          if (!changed) {
            setChanged(true)
          }
          if (val) {
            setNewVal(val)
          }
        }}
      />
    </>
  )
}
