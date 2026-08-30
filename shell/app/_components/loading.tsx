"use client"

import { useAppContext } from "@/ctx/app.context"
import { Spinner } from "@tradalab/lyra/ui"

export function Loading() {
  const { loading } = useAppContext()

  if (!loading) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/10 z-50">
      <Spinner />
    </div>
  )
}
