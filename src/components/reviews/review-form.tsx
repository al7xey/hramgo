"use client";

import Link from "next/link";
import { MessageCircle, Send, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReviewPhotoUploader } from "@/components/reviews/review-photo-uploader";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { cn } from "@/lib/utils";

export function ReviewForm({ templeId }: { templeId: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);

  const goToLogin = () => {
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?intent=reviews&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => {
          if (status !== "authenticated") {
            goToLogin();
            return;
          }

          setIsOpen(true);
        }}
      >
        <MessageCircle className="size-4" aria-hidden />
        Оставить отзыв
      </Button>
    );
  }

  return (
    <LiquidGlassCard className="p-4">
      <form
        className="grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const form = new FormData(event.currentTarget);
          const response = await fetch(`/api/temples/${templeId}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rating,
              text: form.get("text"),
              visitType: form.get("visitType"),
              tags: form.getAll("tags"),
              personalDataConsent: form.get("personalDataConsent") === "on"
            })
          });

          if (response.status === 401) {
            goToLogin();
            return;
          }

          const payload = (await response.json()) as { message?: string };
          setMessage(payload.message ?? "Отзыв опубликован.");
          setPending(false);

          if (response.ok) {
            event.currentTarget.reset();
            setRating(5);
          }
        }}
      >
        <div>
          <h3 className="text-lg font-semibold">Оставить отзыв</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Расскажите, что важно знать перед посещением. Отзыв появится на странице храма сразу после отправки.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Тип посещения</span>
          <select name="visitType" className="h-12 rounded-2xl border border-card-border bg-background px-3 outline-none">
            <option value="PERSONAL_VISIT">Личное посещение</option>
            <option value="SERVICE">Богослужение</option>
            <option value="SUNDAY_SCHOOL">Воскресная школа</option>
            <option value="EVENT">Событие</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>

        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">Оценка</span>
          <div className="flex gap-1 rounded-[22px] border border-card-border bg-background/70 p-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="flex size-11 items-center justify-center rounded-[18px] transition hover:bg-primary-soft"
                aria-label={`${value} из 5`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                <Star className={cn("size-6 text-warning", value <= rating ? "fill-current" : "opacity-35")} aria-hidden />
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Текст отзыва</span>
          <textarea
            name="text"
            required
            className="min-h-36 rounded-[24px] border border-card-border bg-background p-4 outline-none focus:border-primary"
          />
        </label>
        <ReviewPhotoUploader />
        <label className="flex items-start gap-3 rounded-[20px] bg-muted p-3 text-sm leading-6">
          <input name="personalDataConsent" type="checkbox" required className="mt-1 size-4 shrink-0 accent-primary" />
          <span>
            Согласен на обработку персональных данных и принимаю{" "}
            <Link href="/legal/personal-data-consent" className="font-medium text-primary">
              согласие
            </Link>{" "}
            и{" "}
            <Link href="/legal/privacy" className="font-medium text-primary">
              политику конфиденциальности
            </Link>
            .
          </span>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="submit" disabled={pending}>
            <Send className="size-4" aria-hidden />
            {pending ? "Отправляем" : "Опубликовать отзыв"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Скрыть форму
          </Button>
        </div>
        {message && <p className={cn("text-sm", message.includes("ошиб") ? "text-danger" : "text-success")}>{message}</p>}
      </form>
    </LiquidGlassCard>
  );
}
