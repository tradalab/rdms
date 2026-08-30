import { useEffect } from "react"
import { useFieldArray } from "react-hook-form"
import type { UseFormReturn } from "react-hook-form"
import { cn } from "@/lib/utils"
import { FormControl, FormField, FormItem } from "@tradalab/lyra/blocks"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@tradalab/lyra/ui"
import { ArrowDownIcon, ArrowUpIcon, EllipsisVerticalIcon, Trash } from "lucide-react"
import { GridInput } from "@/components/x/grid-input"
import { useTranslation } from "react-i18next"

export function KeyAddValueStream({ form }: { form: UseFormReturn }) {
  const { t } = useTranslation()

  const { fields, insert, remove, append } = useFieldArray({
    control: form.control,
    name: "value_stream",
  })

  useEffect(() => {
    if (fields.length === 0) {
      append({ field: "", value: "" })
    }
  }, [fields.length, append])

  function deleteRow(index: number) {
    remove(index)
  }

  function insertRow(index: number, position: "above" | "below") {
    insert(index + (position === "above" ? 0 : 1), {
      field: "",
      value: "",
    })
  }

  return (
    <div className="rounded-lg border shadow-sm">
      <div className="bg-muted/50 text-muted-foreground grid grid-cols-[1fr_1fr_auto] divide-x divide-border rounded-t-lg">
        <div className="px-2.5 py-2 text-xs font-medium">
          <label id="zset-value-key">{t("field")}</label>
        </div>
        <div className="px-2.5 py-2 text-xs font-medium">
          <label id="zset-value-value">{t("value")}</label>
        </div>
        <div className="w-9" aria-hidden />
      </div>
      {fields.map((item, index) => (
        <div
          key={item.id}
          className={cn("grid grid-cols-[1fr_1fr_auto] divide-x divide-border border-t border-border", {
            "overflow-hidden rounded-b-lg": index === fields.length - 1,
          })}
        >
          <FormField
            control={form.control}
            name={`value_stream.${index}.field`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <GridInput {...field} placeholder="Field" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`value_stream.${index}.value`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <GridInput {...field} placeholder="Value" />
                </FormControl>
              </FormItem>
            )}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Row actions"
                className="text-muted-foreground/60 hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground flex w-9 cursor-pointer items-center justify-center self-stretch"
              >
                <EllipsisVerticalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="gap-x-2" onClick={() => insertRow(index, "above")}>
                <ArrowUpIcon className="text-ui-fg-subtle" />
                {t("insert_row_above")}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-x-2" onClick={() => insertRow(index, "below")}>
                <ArrowDownIcon className="text-ui-fg-subtle" />
                {t("insert_row_below")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-x-2" onClick={() => deleteRow(index)}>
                <Trash className="text-ui-fg-subtle" />
                {t("delete_row")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}
