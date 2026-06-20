"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function ProfileAuthCard() {
  const { data: session, status, update } = useSession();
  const isSignedIn = status === "authenticated";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(session?.user?.name ?? "");
    setImage(session?.user?.image ?? null);
  }, [session?.user?.image, session?.user?.name]);

  return (
    <LiquidGlassCard className="grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary"
          onClick={() => isSignedIn && fileInputRef.current?.click()}
          aria-label="Изменить фото профиля"
        >
          {image ? <img src={image} alt="Фото профиля" className="h-full w-full object-cover" /> : <UserRound className="size-6" aria-hidden />}
        </button>
        <div>
          <h2 className="font-semibold">{isSignedIn ? session.user?.name ?? "Профиль" : "Войдите, чтобы сохранять храмы"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignedIn ? session.user?.email : "Нужны email и пароль. Регистрация занимает несколько секунд."}
          </p>
        </div>
      </div>
      {isSignedIn ? (
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setMessage(null);

            const response = await fetch("/api/me", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name, image })
            });

            setPending(false);

            if (!response.ok) {
              setMessage("Не удалось сохранить профиль.");
              return;
            }

            await update({ name, image });
            setMessage("Профиль сохранён.");
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 900_000) {
                setMessage("Фото слишком большое. Выберите файл до 900 КБ.");
                return;
              }

              const reader = new FileReader();
              reader.onload = () => setImage(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Имя</span>
            <input
              value={name}
              minLength={2}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-[20px] border border-card-border bg-background/72 px-4 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
            />
          </label>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняем" : "Сохранить"}
            </Button>
            <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="size-4" aria-hidden />
              Выйти
            </Button>
          </div>
        </form>
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
