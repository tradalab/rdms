"use client"

import { useEffect, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@tradalab/lyra/ui"
import { Button } from "@tradalab/lyra/ui"
import { useTranslation } from "react-i18next"
import { ScrollArea } from "@tradalab/lyra/ui"
import { Loader2Icon, Trash2Icon, SearchIcon, ChevronDownIcon, ListIcon, AlertTriangleIcon } from "lucide-react"
import { Input } from "@tradalab/lyra/ui"
import { useConfirm } from "@tradalab/lyra/blocks"

interface BrowserBulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefix: string
  onConfirm: (keys: string[]) => Promise<void>
  onScan: (prefix: string, cursor: string) => Promise<{ keys: string[]; nextCursor: string }>
}

export function BrowserBulkDeleteDialog({ open, onOpenChange, prefix, onConfirm, onScan }: BrowserBulkDeleteDialogProps) {
  const { t } = useTranslation()
  const confirm = useConfirm()
  const [keys, setKeys] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [scanCursor, setScanCursor] = useState("0")
  const [filter, setFilter] = useState("")

  useEffect(() => {
    if (open && prefix) {
      setKeys([])
      setScanCursor("0")
      setFilter("")
      loadNextBatch("0")
    } else {
      setKeys([])
      setScanCursor("0")
      setIsScanning(false)
    }
  }, [open, prefix])

  const loadNextBatch = async (cursor: string) => {
    setIsScanning(true)
    let currentCursor = cursor
    let totalCollected = 0
    let newKeys: string[] = []

    try {
      while (true) {
        const result = await onScan(prefix, currentCursor)
        newKeys = [...newKeys, ...(result.keys || [])]
        totalCollected += (result.keys || []).length
        currentCursor = result.nextCursor
        
        if (totalCollected >= 1000 || currentCursor === "0") {
          break
        }
        
        if (newKeys.length > 0) {
          setKeys(prev => [...prev, ...newKeys])
          newKeys = []
        }

        await new Promise(resolve => setTimeout(resolve, 5))
        if (!open) break
      }

      setKeys(prev => [...prev, ...newKeys])
      setScanCursor(currentCursor)
    } finally {
      setIsScanning(false)
    }
  }

  const handleLoadAll = async () => {
    setIsScanning(true)
    let currentCursor = scanCursor
    try {
      while (currentCursor !== "0") {
        const result = await onScan(prefix, currentCursor)
        setKeys(prev => [...prev, ...(result.keys || [])])
        currentCursor = result.nextCursor
        setScanCursor(currentCursor)
        if (!open) break
        await new Promise(resolve => setTimeout(resolve, 5))
      }
    } finally {
      setIsScanning(false)
    }
  }

  const handleDeletePreview = async () => {
    setIsDeleting(true)
    try {
      await onConfirm(keys)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    const ok = await confirm({
      title: t("confirm_delete_all_title"),
      description: t("confirm_delete_all_desc", { prefix }),
      confirmText: t("delete_all"),
      danger: true,
    })

    if (ok) {
      setIsDeleting(true)
      try {
        await onConfirm([])
        onOpenChange(false)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const filteredKeys = useMemo(() => {
    if (!filter) return keys
    return keys.filter(k => k.toLowerCase().includes(filter.toLowerCase()))
  }, [keys, filter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2Icon className="h-5 w-5" />
            {t("confirm_delete")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-4">{t("confirm_delete_folder_desc", { prefix })}</p>

          <div className="relative mb-3">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_preview_placeholder")}
              className="pl-9 h-9 text-xs"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          <div className="border rounded-md bg-muted/30 overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b bg-muted/50 text-xs font-medium flex justify-between items-center h-10 shrink-0">
              <div className="flex items-center gap-2">
                <span>{t("preview_list")}</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                  {t("keys_loaded", { count: keys.length })}
                </span>
              </div>
              <div className="flex items-center gap-2 h-7">
                {isScanning ? (
                  <div className="flex items-center gap-1.5 text-primary">
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    <span className="text-[10px]">{t("scanning")}</span>
                  </div>
                ) : (
                  scanCursor !== "0" && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 font-normal hover:bg-primary/10 hover:text-primary" onClick={() => loadNextBatch(scanCursor)}>
                        <ChevronDownIcon className="h-3 w-3 mr-1" />
                        {t("load_more")}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-1.5 font-normal hover:bg-primary/10 hover:text-primary" onClick={handleLoadAll}>
                        <ListIcon className="h-3 w-3 mr-1" />
                        {t("load_all")}
                      </Button>
                    </div>
                  )
                )}
              </div>
            </div>
            <ScrollArea className="h-[300px]">
              {keys.length === 0 && isScanning ? (
                <div className="flex items-center justify-center h-full py-16">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground opacity-50" />
                </div>
              ) : filteredKeys.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  {keys.length === 0 ? t("no_keys_found") : t("no_matches_in_preview")}
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filteredKeys.map(key => (
                    <div key={key} className="px-2 py-1 text-[11px] font-mono truncate hover:bg-muted/80 rounded transition-colors border border-transparent hover:border-border/50">
                      {key}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="sm:mr-auto" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            {t("cancel")}
          </Button>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="destructive"
              className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20"
              onClick={handleDeletePreview}
              disabled={isDeleting || keys.length === 0}
            >
              {isDeleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {t("delete_preview_count", { count: keys.length })}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeleting || (isScanning && keys.length === 0)}
            >
              {isDeleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              <AlertTriangleIcon className="h-4 w-4 mr-2" />
              {t("delete_everything")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
