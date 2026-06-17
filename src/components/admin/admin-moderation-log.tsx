import { ShieldCheck } from "lucide-react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function AdminModerationLog() {
  return (
    <div className="grid gap-3">
      {[
        "Одобрен демо-отзыв после проверки нейтральной формулировки.",
        "Фото из отзыва отправлено в очередь проверки прав.",
        "Данные о воскресной школе помечены как требующие подтверждения."
      ].map((message) => (
        <LiquidGlassCard key={message} className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 text-success" aria-hidden />
          <p className="text-sm leading-6">{message}</p>
        </LiquidGlassCard>
      ))}
    </div>
  );
}
