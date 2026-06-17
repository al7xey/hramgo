import type { LucideIcon } from "lucide-react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <LiquidGlassCard className="flex flex-col items-center gap-3 px-5 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </LiquidGlassCard>
  );
}
