import { env } from "@/lib/env";

export default function PersonalDataConsentPage() {
  return (
    <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
      <h1>Согласие на обработку персональных данных</h1>
      <p>
        Нажимая кнопки отправки формы на HramGo, пользователь дает согласие оператору {env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME}
        на обработку персональных данных, указанных в форме.
      </p>
      <p>
        Цели обработки: регистрация и вход, публикация и модерация отзывов, обработка обращений, проведение платежа
        поддержки проекта, защита сервиса от злоупотреблений.
      </p>
      <p>
        Согласие действует до его отзыва. Отозвать согласие можно письмом на {env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL}.
      </p>
    </article>
  );
}
