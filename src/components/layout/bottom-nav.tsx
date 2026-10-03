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
    <nav className="fixed inset-x-0 bottom-[max(8px,env(safe-area-inset-bottom))] z-50 px-4 md:hidden">
      <div className="mx-auto grid h-16 w-full max-w-[360px] grid-cols-3 gap-1 rounded-[24px] border border-card-border bg-card p-2 text-foreground shadow-sm">
          {items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex h-12 flex-col gap-1 touch-manipulation items-center justify-center rounded-xl transition-colors duration-100 hover:bg-primary-soft",
                  isActive && "bg-primary-soft text-primary"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="size-5" aria-hidden />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
