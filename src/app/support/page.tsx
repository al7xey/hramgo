import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { SupportPaymentForm } from "@/components/support/support-payment-form";
import { PaymentStatus } from "@/components/support/payment-status";
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
      <Suspense fallback={null}>
        <PaymentStatus />
      </Suspense>
      <LiquidGlassCard className="grid gap-4 p-5">
        <h2 className="text-xl font-semibold">Добровольная поддержка</h2>
        <SupportPaymentForm />
      </LiquidGlassCard>
      <LiquidGlassCard className="grid gap-3 p-5">
        <h2 className="text-xl font-semibold">Перед оплатой</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Выберите сумму и перейдите на страницу ЮKassa. Доступны банковские
          карты, СБП и другие способы, которые предлагает платёжный сервис.
          Поддержка добровольная и не даёт платного доступа к каталогу.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-primary underline">
          <Link
            className="inline-flex min-h-11 items-center"
            href="/legal/support-terms/"
          >
            Условия поддержки
          </Link>
          <Link
            className="inline-flex min-h-11 items-center"
            href="/legal/payment-and-refund/"
          >
            Оплата и возврат
          </Link>
          <Link
            className="inline-flex min-h-11 items-center"
            href="/legal/contacts/"
          >
            Контакты и реквизиты
          </Link>
        </div>
      </LiquidGlassCard>
    </div>
  );
}
