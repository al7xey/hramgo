import Link from "next/link";
import { Camera, Church, ClipboardList, Flag, Import, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

const items = [
  { href: "/admin/temples", label: "Храмы", icon: Church },
  { href: "/admin/reviews", label: "Отзывы", icon: ClipboardList },
  { href: "/admin/review-reports", label: "Сообщения", icon: Flag },
  { href: "/admin/photos", label: "Фото", icon: Camera },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/imports", label: "Импорт", icon: Import },
  { href: "/admin/moderation", label: "Журнал", icon: ShieldCheck }
];

export function AdminSidebar() {
  return (
    <LiquidGlassCard className="p-3">
      <nav className="grid gap-1" aria-label="Админка">
        {items.map((item) => (
          <Button key={item.href} asChild variant="ghost" className="justify-start">
            <Link href={item.href}>
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </LiquidGlassCard>
  );
}
