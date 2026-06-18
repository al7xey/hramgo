import Link from "next/link";
import type { ReactNode } from "react";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function LegalPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <article className="mx-auto grid max-w-4xl gap-5">
      <LiquidGlassCard className="p-5 md:p-7">
        <p className="text-sm font-semibold text-primary">Правовая информация HramGo</p>
        <h1 className="mt-2 text-2xl font-semibold md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </LiquidGlassCard>
      <LiquidGlassCard className="p-5 md:p-7">
        <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-7 prose-li:leading-7">
          {children}
        </div>
      </LiquidGlassCard>
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <Link href="/support" className="text-primary hover:underline">
          Поддержать проект
        </Link>
        <Link href="/legal/support-terms" className="hover:text-primary">
          Условия поддержки
        </Link>
        <Link href="/legal/payment-and-refund" className="hover:text-primary">
          Оплата и возврат
        </Link>
        <Link href="/legal/privacy" className="hover:text-primary">
          Политика ПДн
        </Link>
        <Link href="/legal/contacts" className="hover:text-primary">
          Контакты
        </Link>
      </div>
    </article>
  );
}
