"use client";

import { ContextLink } from "./context-link";
import { usePathname } from "next/navigation";
import { Home, Map, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/temples", label: "Поиск", icon: Search },
  { href: "/map", label: "Карта", icon: Map }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 px-5 md:hidden"
    >
      <div className="mx-auto grid h-[68px] w-full max-w-[336px] grid-cols-3 gap-1 rounded-[34px] border border-card-border bg-white/95 p-1.5 text-[#172033] shadow-[0_8px_28px_rgba(36,75,120,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#071522]/95 dark:text-slate-200">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <ContextLink
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[28px] transition-colors duration-150 hover:bg-primary-soft",
                isActive && "bg-action text-white hover:bg-action"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="size-[22px]" aria-hidden />
              <span className="text-[11px] font-medium leading-3">
                {item.label}
              </span>
            </ContextLink>
          );
        })}
      </div>
    </nav>
  );
}
