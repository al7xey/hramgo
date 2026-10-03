import type { Metadata } from "next";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "Поддержать HramGo",
  description:
    "Добровольная поддержка бесплатного информационного сервиса HramGo.",
  alternates: { canonical: "/support/" }
};
export default function SupportPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Поддержать HramGo</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          HramGo — бесплатный информационный сервис о храмах. Вы можете
          добровольно поддержать развитие проекта. Размер поддержки определяете
          вы сами. Поддержка не является оплатой товара, платного доступа или
          индивидуальной услуги и не предоставляет дополнительных преимуществ.
        </p>
      </div>
      <LiquidGlassCard className="grid gap-4 p-5">
        <h2 className="text-xl font-semibold">Добровольная поддержка</h2>
        <div className="rounded-[20px] border border-card-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
          Приём платежей временно недоступен. Попробуйте позже.
        </div>
        <Button size="lg" className="w-full" disabled>
          Поддержать проект
        </Button>
      </LiquidGlassCard>
    </div>
  );
}
