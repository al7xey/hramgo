import Link from "next/link";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
import { env } from "@/lib/env";
const links = [
  { href: "/legal/contacts/", label: "Контакты" },
  { href: "/sources/", label: "Источники" },
  { href: "/support/", label: "Поддержать проект" }
];
export function LegalFooter() {
  return (
    <footer className="site-container pb-28 pt-8 text-sm text-muted-foreground md:pb-8">
      <div className="grid grid-cols-2 items-start gap-4 border-t border-card-border pt-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-semibold text-foreground">HramGo</p>
          <p className="mt-2 max-w-xs text-xs leading-5">
            Храмы Москвы: адреса, богослужения и маршруты.
          </p>
          <p className="mt-2 text-xs">© {new Date().getFullYear()} HramGo</p>
          <div className="mt-2 grid gap-1 text-xs">
            <Link
              href="/legal/privacy/"
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              Политика данных
            </Link>
            <Link
              href="/legal/terms/"
              className="inline-flex min-h-11 items-center hover:text-primary"
            >
              Условия сайта
            </Link>
          </div>
        </div>
        <nav
          aria-label="О проекте"
          className="grid justify-items-end gap-1 text-right md:grid-cols-2 md:gap-x-6"
        >
          {links.map((link) => (
            <Link
              className="inline-flex min-h-11 items-center hover:text-primary"
              key={link.href}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          <a
            className="inline-flex min-h-11 items-center hover:text-primary"
            href={
              "mailto:" +
              env.SUPPORT_EMAIL +
              "?subject=" +
              encodeURIComponent("Исправление сведений HramGo")
            }
          >
            Сообщить об ошибке
          </a>
        </nav>
      </div>
      <YandexMetrika />
    </footer>
  );
}
