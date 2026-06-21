"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Camera, KeyRound, LogIn, LogOut, Mail, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

type EditSection = "profile" | "email" | "password" | null;

const inputClass =
  "h-11 rounded-[20px] border border-card-border bg-white/70 px-4 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary-soft dark:bg-white/10";

export function ProfileAuthCard() {
  const { data: session, status, update } = useSession();
  const isSignedIn = status === "authenticated";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [section, setSection] = useState<EditSection>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(session?.user?.name ?? "");
    setEmail(session?.user?.email ?? "");
    setImage(session?.user?.image ?? null);
  }, [session?.user?.email, session?.user?.image, session?.user?.name]);

  function resetSensitiveFields() {
    setCurrentPassword("");
    setNewPassword("");
  }

  async function saveProfile() {
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, image })
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Не удалось сохранить профиль.");
      return;
    }

    await update({ name, image });
    setSection(null);
    setMessage("Профиль сохранён.");
  }

  async function saveEmail() {
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, currentPassword })
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Не удалось изменить email.");
      return;
    }

    await update({ email });
    resetSensitiveFields();
    setSection(null);
    setMessage("Email изменён.");
  }

  async function savePassword() {
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.error ?? "Не удалось изменить пароль.");
      return;
    }

    resetSensitiveFields();
    setSection(null);
    setMessage("Пароль изменён.");
  }

  return (
    <LiquidGlassCard className="grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary"
          onClick={() => isSignedIn && section === "profile" && fileInputRef.current?.click()}
          aria-label="Изменить фото профиля"
        >
          {image ? <img src={image} alt="Фото профиля" className="h-full w-full object-cover" /> : <UserRound className="size-6" aria-hidden />}
        </button>
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{isSignedIn ? session.user?.name ?? "Профиль" : "Войдите, чтобы сохранять храмы"}</h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {isSignedIn ? session.user?.email : "Нужны email и пароль. Регистрация занимает несколько секунд."}
          </p>
        </div>
      </div>

      {isSignedIn ? (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSection(section === "profile" ? null : "profile");
                resetSensitiveFields();
                setMessage(null);
              }}
            >
              <Settings className="size-4" aria-hidden />
              Настройки
            </Button>
            <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="size-4" aria-hidden />
              Выйти
            </Button>
          </div>

          {section === "profile" ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void saveProfile();
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
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="size-4" aria-hidden />
                Изменить фото
              </Button>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Имя</span>
                <input value={name} minLength={2} maxLength={80} onChange={(event) => setName(event.target.value)} className={inputClass} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Сохраняем" : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSection(null);
                    setMessage(null);
                    setName(session.user?.name ?? "");
                    setImage(session.user?.image ?? null);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSection(section === "email" ? null : "email");
                resetSensitiveFields();
                setMessage(null);
              }}
            >
              <Mail className="size-4" aria-hidden />
              Сменить email
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSection(section === "password" ? null : "password");
                resetSensitiveFields();
                setMessage(null);
              }}
            >
              <KeyRound className="size-4" aria-hidden />
              Сменить пароль
            </Button>
          </div>

          {section === "email" ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void saveEmail();
              }}
            >
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Новый email / логин</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Текущий пароль</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                />
              </label>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняем" : "Сохранить email"}
              </Button>
            </form>
          ) : null}

          {section === "password" ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void savePassword();
              }}
            >
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Текущий пароль</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Новый пароль</span>
                <input
                  type="password"
                  value={newPassword}
                  minLength={6}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>
              <Button type="submit" disabled={pending}>
                {pending ? "Сохраняем" : "Сохранить пароль"}
              </Button>
            </form>
          ) : null}

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
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
