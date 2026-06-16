import type * as React from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  danger: "border-red-400/20 bg-red-400/10 text-red-300",
  info: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof toneClasses }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
