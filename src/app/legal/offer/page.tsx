import Link from "next/link";
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Правовые условия поддержки HramGo",
  description: "Актуальные условия добровольной поддержки бесплатного информационного сервиса HramGo.",
  alternates: { canonical: "/legal/support-terms" },
  robots: { index: false, follow: true }
};

export default function OfferPage() {
  return (
    <LegalPage
      title="Правовые условия поддержки HramGo"
      description="Для добровольной поддержки проекта действуют актуальные условия, политика обработки персональных данных и порядок оплаты."
    >
      <p>
        HramGo использует модель добровольной поддержки бесплатного информационного проекта. Поддержка не является
        покупкой товара, платного доступа, подписки или индивидуальной услуги и не предоставляет дополнительных
        преимуществ.
      </p>
      <p>
        Актуальные документы доступны на постоянных страницах:
      </p>
      <ul>
        <li>
          <Link href="/legal/support-terms">Условия добровольной поддержки проекта</Link>
        </li>
        <li>
          <Link href="/legal/payment-and-refund">Оплата, отказ и возврат средств</Link>
        </li>
        <li>
          <Link href="/legal/privacy">Политика обработки персональных данных</Link>
        </li>
        <li>
          <Link href="/legal/contacts">Контакты и реквизиты</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
