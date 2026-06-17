import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "muted";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "default" && "border-card-border bg-primary-soft text-foreground",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warning" && "border-warning/35 bg-warning/10 text-warning",
        tone === "muted" && "border-card-border bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
