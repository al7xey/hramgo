"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function ProfileAuthCard() {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <LiquidGlassCard className="grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">{isSignedIn ? session.user?.name ?? "Профиль" : "Войдите, чтобы сохранять храмы"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignedIn ? session.user?.email : "Нужны email и пароль. Регистрация занимает несколько секунд."}
          </p>
        </div>
      </div>
      {isSignedIn ? (
        <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="size-4" aria-hidden />
          Выйти
        </Button>
      ) : (
        <Button asChild>
          <Link href="/login?callbackUrl=/profile">
            <LogIn className="size-4" aria-hidden />
            Войти / регистрация
          </Link>
        </Button>
      )}
    </LiquidGlassCard>
  );
}
