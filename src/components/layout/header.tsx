import Link from "next/link";
import { Heart, Map, MapPin, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/temples", label: "Поиск", icon: Search },
  { href: "/map", label: "Карта", icon: Map },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/profile", label: "Профиль", icon: UserRound }
];

export function Header() {
  return (
    <header className="sticky top-0 z-[80] bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-full font-semibold hover:no-underline active:scale-100" aria-label="HramGo">
          <span className="flex size-10 items-center justify-center rounded-[18px] bg-primary-soft text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="text-lg">HramGo</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Button asChild key={item.href} variant="ghost" size="sm">
              <Link href={item.href} prefetch={false}>
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
