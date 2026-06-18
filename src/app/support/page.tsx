import { SupportPaymentForm } from "@/components/support/support-payment-form";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export default function SupportPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Помочь проекту стать полезнее</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Поддержка помогает проверять данные, улучшать карту и быстрее добавлять новые возможности.
        </p>
      </div>

      <LiquidGlassCard className="grid gap-4 p-5">
        <h2 className="text-xl font-semibold">Помочь проекту</h2>
        <SupportPaymentForm />
      </LiquidGlassCard>

      <LiquidGlassCard className="grid gap-3 p-5">
        <h2 className="text-xl font-semibold">Безопасность платежа</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Оплата проходит на стороне Robokassa. HramGo не хранит данные банковских карт.
        </p>
      </LiquidGlassCard>
    </div>
  );
}
