import type * as React from "react";

import { cn } from "@/lib/utils";

export function LiquidGlassCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-glass", className)} {...props} />;
}
