import { ComponentPropsWithoutRef, forwardRef } from "react"
import { cn } from "@/lib/utils"

export const GridInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      autoComplete="off"
      className={cn(
        "text-foreground placeholder:text-muted-foreground w-full bg-transparent px-2.5 py-2 font-mono text-sm outline-none",
        "focus:bg-accent/40 disabled:text-muted-foreground disabled:cursor-not-allowed",
        className
      )}
    />
  )
})
GridInput.displayName = "GridInput"
