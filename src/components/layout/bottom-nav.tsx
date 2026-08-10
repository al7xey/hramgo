"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className="fixed inset-x-0 bottom-[max(8px,env(safe-area-inset-bottom))] z-50 px-4 md:hidden">
      <div className="mx-auto grid h-16 w-full max-w-[360px] grid-cols-5 gap-1 rounded-[30px] border border-slate-200/90 bg-white/[0.98] p-2 text-[#172033] shadow-none backdrop-blur-md dark:border-white/10 dark:bg-[#071522]/95 dark:text-slate-200">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex h-12 touch-manipulation items-center justify-center rounded-[22px] transition-colors duration-100 hover:bg-[#edf6fd] dark:hover:bg-sky-400/10",
                  isActive && "bg-[#dceefb] text-[#2d8ed8] hover:bg-[#dceefb] dark:bg-sky-400/15 dark:text-sky-300 dark:hover:bg-sky-400/15"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
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
