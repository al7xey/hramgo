import Link from "next/link";
import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Контакты и реквизиты",
  description: "Контакты и публичные реквизиты владельца проекта HramGo.",
  alternates: { canonical: "/legal/contacts" }
};

export default function LegalContactsPage() {
  return (
    <LegalPage title="Контакты и реквизиты" description="Публичные сведения для обращений по работе сервиса и добровольной поддержке проекта.">
      <h2>Владелец проекта</h2>
      <p>ФИО: {env.LEGAL_FULL_NAME}</p>
      <p>ИНН: {env.LEGAL_INN}</p>
      <p>Статус: налогоплательщик налога на профессиональный доход.</p>
      {env.LEGAL_ADDRESS ? <p>Адрес: {env.LEGAL_ADDRESS}</p> : null}

      <h2>Обращения</h2>
      <p>E-mail для обращений: {env.SUPPORT_EMAIL}</p>
      {env.SUPPORT_PHONE ? <p>Телефон: {env.SUPPORT_PHONE}</p> : null}
      <p>Рабочие часы для обработки обращений не указаны владельцем проекта.</p>

      <h2>Ссылки</h2>
      <ul>
        <li>
          <Link href="/support">Страница поддержки проекта</Link>
        </li>
        <li>
          <Link href="/legal/payment-and-refund">Порядок оплаты, отказа и возврата средств</Link>
        </li>
        <li>
          <Link href="/legal/privacy">Политика обработки персональных данных</Link>
        </li>
      </ul>
    </LegalPage>
  );
}
