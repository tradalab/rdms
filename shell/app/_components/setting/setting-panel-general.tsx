"use client"

import { useTranslation } from "react-i18next"
import { useUpdater } from "@/app/_components/updater/updater.context"
import { useTheme } from "next-themes"
import { useState } from "react"
import { useAppContext } from "@/ctx/app.context"
import { useSetting } from "@/hooks/api/setting.api"
import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldSet, FieldDescription } from "@tradalab/lyra/ui"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { Checkbox } from "@tradalab/lyra/ui"
import { Label } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { Spinner } from "@tradalab/lyra/ui"
import { version } from "../../../package.json"

export function SettingPanelGeneral() {
  const { t } = useTranslation()
  const { checkUpdate, fullUpdate, newVersion, notes, loading } = useUpdater()
  const { theme, setTheme } = useTheme()
  const [checked, setChecked] = useState(false)
  const { language, setLanguage, compactMode, setCompactMode } = useAppContext()
  const [autoupdate, setAutoupdate] = useSetting("autoupdate")

  const languages = [
    { value: "en", label: "🇺🇸 English" },
    { value: "ja", label: "🇯🇵 日本語" },
    { value: "vi", label: "🇻🇳 Tiếng Việt" },
  ] as const

  const handleCheck = async () => {
    setChecked(false)
    await checkUpdate({ silent: true })
    setChecked(true)
  }

  return (
    <FieldGroup>
      <FieldSet>
        <Field>
          <FieldLabel htmlFor="theme-select">{t("theme")}</FieldLabel>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger id="theme-select" className="w-full">
              <SelectValue placeholder="Select Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">{t("system")}</SelectItem>
                <SelectItem value="light">{t("light")}</SelectItem>
                <SelectItem value="dark">{t("dark")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="language-select">{t("language")}</FieldLabel>
          <Select value={language ?? "en"} onValueChange={setLanguage}>
            <SelectTrigger id="language-select" className="w-full">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {languages.map(language => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <Field>
          <FieldLabel>{t("compact_mode")}</FieldLabel>
          <Field orientation="horizontal">
            <Checkbox id="compactmode-checkbox" name="compactmode-checkbox" checked={compactMode} onCheckedChange={val => setCompactMode(!!val)} />
            <Label htmlFor="compactmode-checkbox" className="font-normal">
              {t("compact_mode_desc")}
            </Label>
          </Field>
        </Field>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <Field>
          <FieldLabel>{t("auto_update")}</FieldLabel>
          <Field orientation="horizontal">
            <Checkbox
              id="autoupdate-checkbox"
              name="autoupdate-checkbox"
              checked={autoupdate !== "false"}
              onCheckedChange={val => setAutoupdate(val ? "true" : "false")}
            />
            <Label htmlFor="autoupdate-checkbox" className="font-normal">
              {t("auto_check")}
            </Label>
          </Field>
        </Field>
        <Field>
          <FieldLabel>{t("check_update")}</FieldLabel>
          <Button
            className="w-full"
            size="sm"
            variant={checked && newVersion ? "default" : "outline"}
            onClick={checked && newVersion ? () => fullUpdate() : () => handleCheck()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t("checking")}
              </>
            ) : checked && newVersion ? (
              t("update_now")
            ) : (
              t("check_for_updates")
            )}
          </Button>
          <FieldDescription>
            {checked ? (newVersion ? t("update_available", { v: newVersion }) : t("up_to_date")) : `${t("current_version")}: v${version}`}
          </FieldDescription>
          {/* Not translated: it comes from the manifest, which is one file for
              every locale. Only with an update to describe. */}
          {checked && newVersion && notes && <FieldDescription className="whitespace-pre-wrap">{notes}</FieldDescription>}
        </Field>
      </FieldSet>
    </FieldGroup>
  )
}
