import Link from "next/link";
import { Map, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContextLink } from "./context-link";

const navItems = [
  { href: "/temples", label: "Поиск", icon: Search },
  { href: "/map", label: "Карта", icon: Map }
];

export function Header() {
  return (
    <header className="relative inset-x-0 top-0 z-20 bg-background/94 backdrop-blur-xl md:fixed md:z-[1000]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full font-semibold hover:no-underline active:scale-100"
          aria-label="HramGo"
        >
          <span className="flex size-10 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="text-lg">HramGo</span>
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Основная навигация"
        >
          {navItems.map((item) => (
            <Button asChild key={item.href} variant="ghost" size="sm">
              <ContextLink
                href={item.href}
                prefetch={false}
                className="aria-[current=page]:bg-primary-soft"
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </ContextLink>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
