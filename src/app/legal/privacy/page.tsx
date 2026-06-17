import { env } from "@/lib/env";

export default function PrivacyPage() {
  return (
    <LegalPage title="Политика конфиденциальности">
      <p>
        Оператор: {env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME}. Контакт для вопросов по персональным данным:{" "}
        {env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL}.
      </p>
      <p>
        HramGo обрабатывает данные, которые пользователь сам передает сервису: email, имя профиля, избранное, отзывы,
        технические данные запросов и cookie. Данные используются для работы аккаунта, отзывов, модерации, поддержки
        проекта и безопасности сервиса.
      </p>
      <p>
        Справочные данные о храмах берутся из официальных источников и хранятся как текстовые фрагменты, ссылки на
        источники, даты проверки и доказательства полей. Бинарные PDF и изображения официальных сайтов не копируются в
        базу, если для этого нет отдельного основания.
      </p>
      <p>
        Пользователь может запросить уточнение, удаление или ограничение обработки своих данных по контактному email.
      </p>
    </LegalPage>
  );
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
      <h1>{title}</h1>
      {children}
    </article>
  );
}
