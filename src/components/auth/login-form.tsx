"use client";

import { signIn } from "next-auth/react";
import { LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

export function LoginForm({ callbackUrl = "/profile" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <LiquidGlassCard className="p-5">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setPending(true);

          const result = await signIn("credentials", {
            email,
            password,
            name,
            mode,
            redirect: false
          });

          setPending(false);

          if (!result?.ok) {
            setError(mode === "login" ? "Проверьте email и пароль." : "Не удалось создать профиль. Возможно, email уже зарегистрирован.");
            return;
          }

          router.push(callbackUrl);
          router.refresh();
        }}
      >
        <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-card-border bg-background/58 p-1">
          <ModeButton active={mode === "login"} onClick={() => setMode("login")}>
            Вход
          </ModeButton>
          <ModeButton active={mode === "register"} onClick={() => setMode("register")}>
            Регистрация
          </ModeButton>
        </div>

        {mode === "register" ? (
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Имя</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 rounded-[22px] border border-card-border bg-background/72 px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 rounded-[22px] border border-card-border bg-background/72 px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Пароль</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 rounded-[22px] border border-card-border bg-background/72 px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
        </label>

        {error && <p className="rounded-[18px] bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={pending}>
          {mode === "register" ? <UserPlus className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
          {pending ? "Проверяем" : mode === "register" ? "Создать профиль" : "Войти"}
        </Button>
      </form>
    </LiquidGlassCard>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-[20px] text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
        active && "bg-primary-soft text-primary"
      )}
    >
      {children}
    </button>
  );
}
