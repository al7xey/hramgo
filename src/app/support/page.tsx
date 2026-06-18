import type { Metadata } from "next";
import Link from "next/link";

import { SupportPaymentForm } from "@/components/support/support-payment-form";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { env } from "@/lib/env";
import { getMissingSupportPaymentConfig } from "@/lib/support/payment-config";

export const metadata: Metadata = {
  title: "Поддержать HramGo",
  description: "Добровольная поддержка бесплатного информационного сервиса HramGo.",
  alternates: { canonical: "/support" }
};

function getPaymentReadiness() {
  const missing = getMissingSupportPaymentConfig();

  return { enabled: missing.length === 0, missing };
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ status?: string; invoice?: string }> }) {
  const readiness = getPaymentReadiness();
  const params = await searchParams;
  const status = params?.status;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Поддержать HramGo</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          HramGo — бесплатный информационный сервис о храмах. Вы можете добровольно поддержать развитие проекта. Размер
          поддержки определяете вы сами. Поддержка не является оплатой товара, платного доступа или индивидуальной услуги
          и не предоставляет дополнительных преимуществ.
        </p>
      </div>

      {status === "success" ? (
        <LiquidGlassCard className="grid gap-2 p-5">
          <h2 className="text-xl font-semibold">Спасибо за поддержку</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Если платеж был подтвержден Robokassa, его статус обновится автоматически после серверного уведомления.
          </p>
        </LiquidGlassCard>
      ) : null}

      {status === "fail" ? (
        <LiquidGlassCard className="grid gap-2 p-5">
          <h2 className="text-xl font-semibold">Платеж не завершен</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Можно вернуться к форме и попробовать снова. Переход на эту страницу сам по себе не меняет статус платежа.
          </p>
        </LiquidGlassCard>
      ) : null}

      <LiquidGlassCard className="grid gap-4 p-5">
        <h2 className="text-xl font-semibold">Добровольная поддержка</h2>
        <SupportPaymentForm
          minAmount={env.MIN_SUPPORT_AMOUNT_RUB}
          maxAmount={env.MAX_SUPPORT_AMOUNT_RUB}
          paymentEnabled={readiness.enabled}
          missingConfig={readiness.missing}
        />
      </LiquidGlassCard>

      <LiquidGlassCard className="grid gap-3 p-5">
        <h2 className="text-xl font-semibold">Перед оплатой</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Оплата проходит на стороне Robokassa. HramGo не хранит данные банковских карт и не подключает автоплатежи.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/legal/support-terms" className="font-medium text-primary">
            Условия поддержки
          </Link>
          <Link href="/legal/payment-and-refund" className="font-medium text-primary">
            Оплата и возврат
          </Link>
          <Link href="/legal/privacy" className="font-medium text-primary">
            Политика обработки персональных данных
          </Link>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
