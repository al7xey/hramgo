import Link from "next/link";
import { Heart, HeartHandshake, MessageCircle, Settings } from "lucide-react";

import { ProfileAuthCard } from "@/components/auth/profile-auth-card";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export default function ProfilePage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Профиль</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Избранное, ваши отзывы и настройки интерфейса.</p>
      </div>

      <ProfileAuthCard />

      <div className="grid gap-3 sm:grid-cols-2">
        <ProfileLink href="/profile/favorites" icon={Heart} label="Избранное" />
        <ProfileLink href="/profile/reviews" icon={MessageCircle} label="Мои отзывы" />
        <ProfileLink href="/support" icon={HeartHandshake} label="Поддержать проект" />
      </div>

      <LiquidGlassCard className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Тема</h2>
            <p className="mt-1 text-sm text-muted-foreground">Светлая, темная или системная.</p>
          </div>
          <Settings className="size-5 text-primary" aria-hidden />
        </div>
        <ThemeToggle />
      </LiquidGlassCard>
    </div>
  );
}

function ProfileLink({ href, icon: Icon, label }: { href: string; icon: typeof Heart; label: string }) {
  return (
    <Link
      href={href}
      className="glass flex items-center gap-3 rounded-glass p-4 font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-primary/35"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      {label}
    </Link>
  );
}
