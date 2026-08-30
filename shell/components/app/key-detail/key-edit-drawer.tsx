"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Spinner,
  Textarea,
  toast,
} from "@tradalab/lyra/ui"
import { useHashFieldUpdate, useListItemUpdate, useSetMemberUpdate, useZsetMemberUpdate } from "@/hooks/api/key.api"

// Discriminated by kind; the parent detail component maps its row to one of these.
export type KeyEditItem =
  | { kind: "hash"; field: string; value: string }
  | { kind: "list"; index: number; value: string }
  | { kind: "set"; member: string }
  | { kind: "zset"; member: string; score: string }

type Props = {
  connectionId: string
  databaseIdx: number
  keyName: string
  item: KeyEditItem | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// Stable per-row signature (identity only, not the value) used to decide when to
// re-seed the form - so a background refetch that rebuilds `item` never clobbers
// what the user is typing, while opening a different row still re-seeds.
function itemIdentity(item: KeyEditItem | null): string {
  if (!item) return ""
  if (item.kind === "hash") return `hash ${item.field}`
  if (item.kind === "list") return `list ${item.index}`
  // set | zset both carry `member`
  return `${item.kind} ${item.member}`
}

export function KeyEditDrawer({ connectionId, databaseIdx, keyName, item, onOpenChange, onSaved }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const [text, setText] = useState("") // hash field name / set member / zset member
  const [value, setValue] = useState("") // hash value / list value
  const [score, setScore] = useState("") // zset score

  const hashUpdate = useHashFieldUpdate(connectionId, databaseIdx)
  const listUpdate = useListItemUpdate(connectionId, databaseIdx)
  const setUpdate = useSetMemberUpdate(connectionId, databaseIdx)
  const zsetUpdate = useZsetMemberUpdate(connectionId, databaseIdx)

  const itemRef = useRef(item)
  itemRef.current = item
  const itemKey = itemIdentity(item)
  useEffect(() => {
    const it = itemRef.current
    if (!it) return
    switch (it.kind) {
      case "hash":
        setText(it.field)
        setValue(it.value)
        break
      case "list":
        setValue(it.value)
        break
      case "set":
        setText(it.member)
        break
      case "zset":
        setText(it.member)
        // score is typed string but the paging layer fills it with a number.
        setScore(String(it.score))
        break
    }
  }, [itemKey])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!item) return
    setLoading(true)
    try {
      switch (item.kind) {
        case "hash":
          await hashUpdate.mutateAsync({
            connection_id: connectionId,
            database_index: databaseIdx,
            key: keyName,
            field: item.field,
            new_field: text,
            value,
          })
          break
        case "list":
          await listUpdate.mutateAsync({
            connection_id: connectionId,
            database_index: databaseIdx,
            key: keyName,
            index: item.index,
            old_value: item.value,
            value,
          })
          break
        case "set":
          await setUpdate.mutateAsync({
            connection_id: connectionId,
            database_index: databaseIdx,
            key: keyName,
            member: item.member,
            new_member: text,
          })
          break
        case "zset": {
          const trimmed = score.trim()
          const n = Number(trimmed)
          if (trimmed === "" || Number.isNaN(n)) {
            toast.add({ title: t("invalid_score"), type: "error" })
            setLoading(false)
            return
          }
          await zsetUpdate.mutateAsync({
            connection_id: connectionId,
            database_index: databaseIdx,
            key: keyName,
            member: item.member,
            new_member: text,
            score: n,
          })
          break
        }
      }
      toast.add({ title: t("updated"), type: "success" })
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : t("unknown_error")
      toast.add({ title: t(msg as never, { defaultValue: msg }), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer direction="right" open={!!item} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex h-full flex-col">
          <DrawerHeader>
            <DrawerTitle>{t("edit_item")}</DrawerTitle>
            <DrawerDescription>{t("edit_item_desc")}</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
            {item?.kind === "hash" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-hash-field">{t("field")}</Label>
                  <Input id="edit-hash-field" value={text} onChange={e => setText(e.target.value)} placeholder="Field" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-hash-value">{t("value")}</Label>
                  <Textarea
                    id="edit-hash-value"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Value"
                  />
                </div>
              </>
            )}
            {item?.kind === "list" && (
              <>
                <div className="grid gap-2">
                  <Label>{t("index")}</Label>
                  <Input value={String(item.index)} readOnly disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-list-value">{t("value")}</Label>
                  <Textarea
                    id="edit-list-value"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Value"
                  />
                </div>
              </>
            )}
            {item?.kind === "set" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-set-member">{t("member")}</Label>
                <Textarea
                  id="edit-set-member"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder="Member"
                />
              </div>
            )}
            {item?.kind === "zset" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-zset-member">{t("member")}</Label>
                  <Textarea
                    id="edit-zset-member"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                    placeholder="Member"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-zset-score">{t("score")}</Label>
                  <Input id="edit-zset-score" type="number" step="any" value={score} onChange={e => setScore(e.target.value)} placeholder="Score" />
                </div>
              </>
            )}
          </div>
          <DrawerFooter className="flex-row justify-end">
            <DrawerClose asChild>
              <Button size="sm" variant="outline" type="button">
                {t("cancel")}
              </Button>
            </DrawerClose>
            <Button size="sm" type="submit" disabled={loading}>
              {loading && <Spinner />}
              {t("save")}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
