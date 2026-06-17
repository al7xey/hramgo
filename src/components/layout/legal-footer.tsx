import Link from "next/link";

const links = [
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/personal-data-consent", label: "Согласие на ПДн" },
  { href: "/legal/terms", label: "Условия" },
  { href: "/legal/offer", label: "Публичная оферта" },
  { href: "/legal/cookies", label: "Cookies" }
];

export function LegalFooter() {
  return (
    <footer className="mx-auto w-full max-w-7xl px-4 pb-28 pt-8 text-xs text-muted-foreground sm:px-6 md:pb-8 lg:px-8">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-primary">
            {link.label}
          </Link>
        ))}
      </div>
      <p className="mt-3">HramGo хранит только легкие справочные данные и ссылки на официальные источники.</p>
    </footer>
  );
}
