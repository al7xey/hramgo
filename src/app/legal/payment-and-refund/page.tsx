import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Оплата, отказ и возврат средств",
  description: "Порядок оплаты добровольной поддержки HramGo через Robokassa и обращения за возвратом.",
  alternates: { canonical: "/legal/payment-and-refund" }
};

export default function PaymentAndRefundPage() {
  const reviewDays = env.RETURN_REQUEST_REVIEW_DAYS;
  const paymentDays = env.RETURN_PAYMENT_DAYS;

  return (
    <LegalPage title="Оплата, отказ и возврат средств" description="Добровольная поддержка оформляется как разовый платеж без автоплатежей и подписки.">
      <h2>Способы оплаты</h2>
      <p>Оплата проводится через Robokassa доступными на ее платежной странице способами.</p>

      <h2>Отказ от поддержки до оплаты</h2>
      <p>
        Пользователь может отказаться до подтверждения платежа: закрыть страницу оплаты или не подтверждать операцию в банке
        или платежной системе.
      </p>

      <h2>Обращение за возвратом после оплаты</h2>
      <ol>
        <li>Пользователь отправляет обращение на e-mail поддержки: {env.SUPPORT_EMAIL}.</li>
        <li>
          В обращении указывает дату платежа, сумму, e-mail, использованный при оплате, идентификатор платежа при наличии и
          причину обращения.
        </li>
        <li>
          Обращение регистрируется и рассматривается
          {reviewDays ? ` в течение ${reviewDays} календарных дней` : " после заполнения владельцем проекта срока RETURN_REQUEST_REVIEW_DAYS"}.
        </li>
        <li>О результате пользователю сообщается на e-mail.</li>
        <li>
          При одобрении возврат производится
          {paymentDays ? ` в течение ${paymentDays} календарных дней` : " после заполнения владельцем проекта срока RETURN_PAYMENT_DAYS"} тем же
          способом оплаты, которым был совершен платеж, если это технически возможно.
        </li>
        <li>Возврат проводится в полной одобренной сумме.</li>
      </ol>

      {!reviewDays || !paymentDays ? (
        <p>
          Владелец проекта должен заполнить переменные RETURN_REQUEST_REVIEW_DAYS и RETURN_PAYMENT_DAYS до включения
          production-оплаты, чтобы на странице не оставалось незаполненных сроков.
        </p>
      ) : null}
    </LegalPage>
  );
}
