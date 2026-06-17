"use client";

import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const amounts = [300, 700, 1500];

export function SupportPaymentForm() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState(amounts[0]);
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [email, session?.user?.email]);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage(null);

        const response = await fetch("/api/support/payment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ amount, email, personalDataConsent: consent })
        });
        const payload = (await response.json()) as { confirmationUrl?: string; message?: string };

        setPending(false);

        if (payload.confirmationUrl) {
          window.location.href = payload.confirmationUrl;
          return;
        }

        setMessage(payload.message ?? "Не удалось перейти к оплате");
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {amounts.map((item) => (
          <button
            key={item}
            type="button"
            className={`min-h-11 rounded-[18px] border px-3 text-sm font-semibold transition ${
              amount === item ? "border-primary bg-primary-soft text-primary" : "border-card-border bg-background"
            }`}
            onClick={() => setAmount(item)}
          >
            {item} ₽
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Своя сумма</span>
        <input
          type="number"
          min={50}
          max={150000}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="h-12 rounded-2xl border border-card-border bg-background px-3 outline-none focus:border-primary"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Email для уведомления</span>
        <input
          type="email"
          required
          value={email || session?.user?.email || ""}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-2xl border border-card-border bg-background px-3 outline-none focus:border-primary"
        />
      </label>
      <label className="flex items-start gap-3 rounded-[20px] bg-muted p-3 text-sm leading-6">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span>
          Согласен на обработку персональных данных и принимаю{" "}
          <Link href="/legal/privacy" className="font-medium text-primary">
            политику конфиденциальности
          </Link>
          .
        </span>
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <HeartHandshake className="size-5" aria-hidden />
        {pending ? "Переходим к оплате" : "Поддержать проект"}
      </Button>
      {message && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
