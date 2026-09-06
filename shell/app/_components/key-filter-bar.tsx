"use client"

import {
  Badge,
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from "@tradalab/lyra/ui"
import { BookmarkIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon, SquareIcon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDebounce } from "@/hooks/use-debounce"
import { usePresetDelete, usePresetList, usePresetUpsert } from "@/hooks/api/preset.api"
import type { KeyFilter, SearchPresetItem } from "@/types"

export const emptyFilters = (): KeyFilter[] => [{ pattern: "", mode: "substring", exclude: false, ignore_case: true }]

const MODES = ["substring", "glob", "regex"] as const

const KEY_TYPES = ["string", "list", "set", "zset", "hash", "stream", "rejson-rl", "graphdata"] as const

const ANY_TYPE = "__any__"

type Props = {
  filters: KeyFilter[]
  onFiltersChange: (next: KeyFilter[]) => void
  matchAll: boolean
  onMatchAllChange: (next: boolean) => void
  keyType: string
  onKeyTypeChange: (next: string) => void
  isLoading: boolean
  scanned: number
  matched: number
  error?: string | null
  onStop: () => void
  className?: string
}

export function KeyFilterBar({
  filters,
  onFiltersChange,
  matchAll,
  onMatchAllChange,
  keyType,
  onKeyTypeChange,
  isLoading,
  scanned,
  matched,
  error,
  onStop,
  className,
}: Props) {
  const { t } = useTranslation()
  const { data: presets = [] } = usePresetList()
  const savePreset = usePresetUpsert()
  const deletePreset = usePresetDelete()
  const [presetName, setPresetName] = useState("")

  const [local, setLocal] = useState<KeyFilter[]>(filters)
  const debounced = useDebounce(local, 300)

  useEffect(() => {
    onFiltersChange(debounced)
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, changes: Partial<KeyFilter>) => {
    setLocal(prev => prev.map((f, idx) => (idx === i ? { ...f, ...changes } : f)))
  }

  const addClause = () => {
    setLocal(prev => [...prev, { pattern: "", mode: "glob", exclude: false, ignore_case: false }])
  }

  const removeClause = (i: number) => {
    if (i === 0) return // clause 0 is the text box; clear it instead of deleting it
    setLocal(prev => prev.filter((_, idx) => idx !== i))
  }

  const extra = local.slice(1).filter(f => f.pattern.trim() !== "")
  const activeCount = local.filter(f => f.pattern.trim() !== "").length
  const modeLabel = (mode: string) => t(`filter_mode_${mode || "glob"}`)

  const applyPreset = (p: SearchPresetItem) => {
    const next = p.filters?.length ? p.filters : emptyFilters()
    setLocal(next)
    onFiltersChange(next)
    onMatchAllChange(p.match_all)
    onKeyTypeChange(p.key_type || "")
  }

  const saveCurrent = async () => {
    const name = presetName.trim()
    if (!name || savePreset.isPending) return
    const existing = presets.find(p => p.name === name)
    await savePreset.mutateAsync({ id: existing?.id ?? "", name, filters: local, match_all: matchAll, key_type: keyType })
    setPresetName("")
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8"
            placeholder={t("filter")}
            value={local[0]?.pattern ?? ""}
            onChange={e => patch(0, { pattern: e.target.value })}
            aria-invalid={Boolean(error)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon-sm" variant={activeCount > 1 ? "default" : "outline"} title={t("filter_advanced")}>
              <SlidersHorizontalIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{t("filter_advanced")}</Label>
              {local.filter(f => !f.exclude && f.pattern.trim() !== "").length > 1 && (
                <ToggleGroup type="single" size="sm" value={matchAll ? "all" : "any"} onValueChange={v => v && onMatchAllChange(v === "all")}>
                  <ToggleGroupItem value="all" className="h-7 px-2 text-xs">
                    {t("filter_match_all")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="any" className="h-7 px-2 text-xs">
                    {t("filter_match_any")}
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label className="w-20 shrink-0 text-xs text-muted-foreground">{t("filter_type")}</Label>
              <Select value={keyType || ANY_TYPE} onValueChange={v => onKeyTypeChange(v === ANY_TYPE ? "" : v)}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_TYPE} className="text-xs">
                    {t("filter_type_any")}
                  </SelectItem>
                  {KEY_TYPES.map(k => (
                    <SelectItem key={k} value={k} className="font-mono text-xs">
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              {local.map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Select value={f.mode || "glob"} onValueChange={v => patch(i, { mode: v })}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODES.map(m => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {modeLabel(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 flex-1 font-mono text-xs"
                      placeholder={f.mode === "regex" ? "^user:\\d+$" : f.mode === "glob" ? "user:*" : "user"}
                      value={f.pattern}
                      onChange={e => patch(i, { pattern: e.target.value })}
                    />
                    {i > 0 && (
                      <Button size="icon-sm" variant="ghost" onClick={() => removeClause(i)} title={t("filter_remove")}>
                        <XIcon />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 pl-1">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={f.exclude} onCheckedChange={v => patch(i, { exclude: v })} />
                      {t("filter_exclude")}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={f.ignore_case} onCheckedChange={v => patch(i, { ignore_case: v })} />
                      {t("filter_ignore_case")}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" className="w-full" onClick={addClause}>
              <PlusIcon /> {t("filter_add_clause")}
            </Button>

            {local.some(f => f.ignore_case && f.pattern.trim() !== "") && (
              <p className="text-[11px] leading-snug text-muted-foreground">{t("filter_ignore_case_hint")}</p>
            )}

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">{t("preset_title")}</Label>

              {presets.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {presets.map(p => (
                    <div key={p.id} className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 flex-1 justify-start px-2 text-xs font-normal" onClick={() => applyPreset(p)}>
                        <BookmarkIcon className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="truncate">{p.name}</span>
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => deletePreset.mutate(p.id)} title={t("delete")}>
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1">
                <Input
                  className="h-8 flex-1 text-xs"
                  placeholder={t("preset_name_placeholder")}
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") void saveCurrent()
                  }}
                />
                <Button size="sm" variant="outline" className="h-8" disabled={!presetName.trim() || savePreset.isPending} onClick={() => void saveCurrent()}>
                  {t("preset_save")}
                </Button>
              </div>

              {savePreset.isError && <p className="text-[11px] leading-snug text-destructive">{(savePreset.error as Error)?.message}</p>}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {extra.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {extra.map((f, i) => (
            <Badge key={i} variant={f.exclude ? "destructive" : "secondary"} className="max-w-full gap-1 font-mono text-[10px]">
              <span className="truncate">
                {f.exclude ? "−" : "+"} {f.pattern}
              </span>
              <button type="button" onClick={() => removeClause(local.indexOf(f))} className="opacity-60 hover:opacity-100" aria-label={t("filter_remove")}>
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-[11px] leading-snug text-destructive">{error}</p>}

      {isLoading && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate tabular-nums">{t("search_progress", { scanned: scanned.toLocaleString(), matched: matched.toLocaleString() })}</span>
          <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[11px]" onClick={onStop}>
            <SquareIcon className="h-3 w-3" /> {t("search_stop")}
          </Button>
        </div>
      )}
    </div>
  )
}
