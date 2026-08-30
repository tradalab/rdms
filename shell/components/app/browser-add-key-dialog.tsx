"use client"

import { ReactNode, useState } from "react"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, toast } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@tradalab/lyra/blocks"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@tradalab/lyra/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@tradalab/lyra/ui"
import { CodeEditor } from "@/components/x/code-editor"
import { useAppContext } from "@/ctx/app.context"
import { KeyKindEnum } from "@/types/key-kind.enum"
import { KeyAddValueList } from "@/components/app/key-add/key-add-value-list"
import { KeyAddValueHash } from "@/components/app/key-add/key-add-value-hash"
import { KeyAddValueSet } from "@/components/app/key-add/key-add-value-set"
import { KeyAddValueZset } from "@/components/app/key-add/key-add-value-zset"
import { useKeyCreate } from "@/hooks/api/client.api"
import { useTranslation } from "react-i18next"
import { KeyAddValueStream } from "@/components/app/key-add/key-add-value-stream"

export function BrowserAddKeyDialog({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { selectedDb, selectedDbIdx } = useAppContext()
  const createMutation = useKeyCreate(selectedDb || "", selectedDbIdx)

  const form = useForm<any>({
    defaultValues: {
      key: "",
      kind: KeyKindEnum.STRING,
      ttl: -1,
      value_string: "",
      value_list: [" "],
      value_hash: [{ key: "", value: "" }],
      value_set: [" "],
      value_zset: [{ member: "", score: 0 }],
      value_stream: {},
      value_json: "",
    },
    resolver: zodResolver(
      z.object({
        key: z.string().min(1, { message: "Key must contain at least 1 character(s)" }),
        kind: z.string(),
        ttl: z.number().min(-1),
        value_string: z.any().optional(),
        value_list: z.any().optional(),
        value_hash: z.any().optional(),
        value_set: z.any().optional(),
        value_zset: z.any().optional(),
        value_stream: z.any().optional(),
        value_json: z.any().optional(),
      })
    ),
  })

  const submit = form.handleSubmit(async values => {
    if (values.kind == KeyKindEnum.JSON) {
      try {
        JSON.parse(values.value_json ?? "")
      } catch {
        toast.add({ title: t("invalid_json"), type: "error" })
        return
      }
    }
    if (values.kind == KeyKindEnum.STREAM) {
      const entries = (values.value_stream ?? []).filter((i: any) => i?.field !== "").map((i: any) => [i?.field, i?.value])
      values.value_stream = {
        id: "*",
        values: JSON.stringify(Object.fromEntries(entries)),
      }
    }
    try {
      await createMutation.mutateAsync({
        connection_id: selectedDb || "",
        database_index: selectedDbIdx,
        ...values,
      })
      toast.add({ title: t("created"), type: "success" })
      setOpen(false)
      form.reset()
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : t("unknown_error")
      toast.add({ title: msg, type: "error" })
    }
  })

  const kindValue: KeyKindEnum = form.watch("kind")

  return (
    <Dialog open={open} onOpenChange={value => !form.formState.isSubmitting && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-sm">{t("new_key")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Key</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="ttl"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">TTL (second)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={-1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["string", "list", "hash", "set", "zset", "stream", KeyKindEnum.JSON].map(e => (
                            <SelectItem key={e} value={e}>
                              {e === KeyKindEnum.JSON ? "JSON" : e.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            {kindValue == KeyKindEnum.STRING && (
              <FormField
                control={form.control}
                name="value_string"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">Value</FormLabel>
                      <FormControl>
                        <CodeEditor {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            )}
            {kindValue == KeyKindEnum.JSON && (
              <FormField
                control={form.control}
                name="value_json"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">Value</FormLabel>
                      <FormControl>
                        <CodeEditor {...field} language="json" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            )}
            {kindValue == KeyKindEnum.LIST && (
              <FormField
                control={form.control}
                name="value_list"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Value</FormLabel>
                    <FormControl>
                      <KeyAddValueList form={form} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {kindValue == KeyKindEnum.HASH && (
              <FormField
                control={form.control}
                name="value_hash"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Value</FormLabel>
                    <FormControl>
                      <KeyAddValueHash form={form} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {kindValue == KeyKindEnum.SET && (
              <FormField
                control={form.control}
                name="value_set"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Value</FormLabel>
                    <FormControl>
                      <KeyAddValueSet form={form} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {kindValue == KeyKindEnum.ZSET && (
              <FormField
                control={form.control}
                name="value_zset"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Value</FormLabel>
                    <FormControl>
                      <KeyAddValueZset form={form} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {kindValue == KeyKindEnum.STREAM && (
              <FormField
                control={form.control}
                name="value_stream"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">Value</FormLabel>
                    <FormControl>
                      <KeyAddValueStream form={form} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button className="cursor-pointer" variant="outline" disabled={form.formState.isSubmitting}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button className="cursor-pointer" type="submit" disabled={form.formState.isSubmitting}>
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
