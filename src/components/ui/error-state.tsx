import { AlertTriangle } from "lucide-react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function ErrorState({ message }: { message: string }) {
  return (
    <LiquidGlassCard className="flex items-start gap-3 px-5 py-4 text-sm text-danger">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>{message}</p>
    </LiquidGlassCard>
  );
}
