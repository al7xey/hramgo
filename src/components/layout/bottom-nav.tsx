"use client";

import Link from "next/link";
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
      <div className="mx-auto grid h-[68px] w-full max-w-[336px] grid-cols-3 gap-1 rounded-[34px] border border-card-border bg-white/95 p-1.5 text-[#172033] shadow-[0_8px_28px_rgba(39,103,151,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#071522]/95 dark:text-slate-200">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[28px] transition-colors duration-150 hover:bg-[#edf6fd] dark:hover:bg-sky-400/10",
                isActive &&
                  "bg-[#dceefb] text-[#2d8ed8] hover:bg-[#dceefb] dark:bg-sky-400/15 dark:text-sky-300 dark:hover:bg-sky-400/15"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="size-[22px]" aria-hidden />
              <span className="text-[10px] font-medium leading-3">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
