import Link from "next/link";

const legalLinks = [
  { href: "/legal/support-terms", label: "Условия поддержки" },
  { href: "/legal/payment-and-refund", label: "Оплата и возврат" },
  { href: "/legal/privacy", label: "Политика ПДн" },
  { href: "/legal/contacts", label: "Контакты и реквизиты" }
];

const serviceLinks = [
  { href: "/legal/personal-data-consent", label: "Согласие на ПДн" },
  { href: "/legal/terms", label: "Условия сайта" },
  { href: "/legal/cookies", label: "Cookies" }
];

export function LegalFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-28 pt-8 text-xs text-muted-foreground sm:px-6 md:pb-8 lg:px-8">
      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-semibold text-foreground">Правовая информация</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground">Документы сайта</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {serviceLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3">HramGo хранит только легкие справочные данные и ссылки на официальные источники.</p>
    </footer>
  );
}
