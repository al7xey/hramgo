"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Home, Map, Search, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/temples", label: "Поиск", icon: Search },
  { href: "/map", label: "Карта", icon: Map },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/profile", label: "Профиль", icon: UserRound }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[min(calc(100vw-32px),360px)] -translate-x-1/2 md:hidden">
      <div className="grid h-16 grid-cols-5 gap-1 rounded-[30px] border border-card-border bg-white/[0.985] p-2 text-[#172033] shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#101827]/95 dark:text-slate-200">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex h-12 items-center justify-center rounded-[22px] transition-colors hover:bg-[#edf6fd] active:scale-[0.98] dark:hover:bg-sky-400/10",
                isActive && "bg-[#dceefb] text-[#2d8ed8] hover:bg-[#dceefb] dark:bg-sky-400/15 dark:text-sky-300 dark:hover:bg-sky-400/15"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              onMouseEnter={() => !isActive && router.prefetch(item.href)}
              onTouchStart={() => !isActive && router.prefetch(item.href)}
              onClick={(event) => {
                if (isActive) {
                  event.preventDefault();
                }
              }}
            >
              <item.icon className="size-5" aria-hidden />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
