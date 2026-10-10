"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HeartHandshake, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supportConfig } from "@/lib/support/config";

const examples = [300, 700, 1500];
const field =
  "min-h-12 w-full rounded-[18px] border border-card-border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-action";

export function SupportPaymentForm() {
  const [amount, setAmount] = useState(
    String(supportConfig.MIN_SUPPORT_AMOUNT_RUB)
  );
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [health, setHealth] = useState<"checking" | "enabled" | "error">(
    "checking"
  );
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setHealth("checking");
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch("/api/support/health", {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok || (await response.json()).enabled !== true)
          throw new Error("unavailable");
        setHealth("enabled");
      })
      .catch(() => {
        if (!cancelled) setHealth("error");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [retry]);
  const amountNumber = Number(amount);
  const validAmount =
    Number.isFinite(amountNumber) &&
    amountNumber >= supportConfig.MIN_SUPPORT_AMOUNT_RUB &&
    amountNumber <= supportConfig.MAX_SUPPORT_AMOUNT_RUB;
  return (
    <form
      className="ym-hide-content grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (
          submitting.current ||
          health !== "enabled" ||
          !consent ||
          !validAmount
        )
          return;
        submitting.current = true;
        setPending(true);
        setMessage(null);
        const normalizedEmail = email.trim().toLowerCase();
        const fingerprint = JSON.stringify([amountNumber, normalizedEmail]);
        if (attempt.current?.fingerprint !== fingerprint)
          attempt.current = { fingerprint, key: crypto.randomUUID() };
        const key = attempt.current.key;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch("/api/support/payment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              amount: amountNumber,
              email: normalizedEmail,
              personalDataConsent: true,
              idempotencyKey: key
            })
          });
          const payload = await response.json();
          if (!response.ok) {
            if (response.status === 410) attempt.current = null;
            throw new Error(
              payload.message ||
                "Не удалось перейти к оплате. Повторите попытку."
            );
          }
          if (payload.status === "succeeded") {
            setMessage("Этот платёж уже подтверждён. Спасибо за поддержку!");
            return;
          }
          if (payload.status === "canceled") {
            attempt.current = null;
            throw new Error("Этот платёж отменён. Можно начать заново.");
          }
          const url = new URL(payload.confirmationUrl);
          if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.port ||
            !["yoomoney.ru", "yookassa.ru"].some(
              (domain) =>
                url.hostname === domain || url.hostname.endsWith("." + domain)
            )
          )
            throw new Error("Не удалось проверить страницу оплаты.");
          try {
            sessionStorage.setItem("hramgo-support-request", key);
          } catch {
            /* Payment does not require browser storage. */
          }
          window.location.assign(url.href);
        } catch (error) {
          setMessage(
            error instanceof Error && error.name !== "AbortError"
              ? error.message
              : "Ответ занимает больше времени. Повторите попытку — новый платёж не будет создан."
          );
        } finally {
          clearTimeout(timer);
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      <fieldset className="grid gap-2" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Выберите сумму</legend>
        <div className="grid grid-cols-3 gap-2">
          {examples.map((value) => (
            <Button
              key={value}
              type="button"
              variant={amountNumber === value ? "primary" : "outline"}
              aria-pressed={amountNumber === value}
              onClick={() => setAmount(String(value))}
            >
              {value} ₽
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium">
        Своя сумма, ₽
        <input
          className={field}
          type="number"
          inputMode="decimal"
          required
          min={supportConfig.MIN_SUPPORT_AMOUNT_RUB}
          max={supportConfig.MAX_SUPPORT_AMOUNT_RUB}
          step="0.01"
          value={amount}
          disabled={pending}
          onChange={(event) => setAmount(event.target.value)}
          aria-describedby="support-amount-hint"
        />
        <span
          id="support-amount-hint"
          className="text-xs font-normal text-muted-foreground"
        >
          От {supportConfig.MIN_SUPPORT_AMOUNT_RUB.toLocaleString("ru")} до{" "}
          {supportConfig.MAX_SUPPORT_AMOUNT_RUB.toLocaleString("ru")} ₽
        </span>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Email для связи по платежу
        <input
          className={field}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          disabled={pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <span className="text-xs font-normal leading-5 text-muted-foreground">
          Для обработки платежа и обращений по нему. Не используется для
          рекламных рассылок.
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-[20px] bg-muted p-3 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-action"
          required
          disabled={pending}
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Согласен с{" "}
          <Link href="/legal/support-terms/" className="text-primary underline">
            условиями добровольной поддержки
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy/" className="text-primary underline">
            политикой обработки данных
          </Link>
          .
        </span>
      </label>
      {health === "error" && (
        <div role="alert" className="grid gap-2 text-sm">
          <p>Не удалось связаться с платёжным сервисом.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRetry((value) => value + 1)}
          >
            Повторить проверку
          </Button>
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || health !== "enabled" || !consent || !validAmount}
      >
        <HeartHandshake className="size-5" aria-hidden />
        {pending
          ? "Открываем ЮKassa…"
          : health === "checking"
            ? "Проверяем доступность…"
            : "Поддержать проект"}
      </Button>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
        Разовая оплата на защищённой странице ЮKassa. Банковские данные не
        вводятся на HramGo. Автоплатежей нет.
      </p>
      {message && (
        <p role="status" className="text-sm leading-6">
          {message}
        </p>
      )}
    </form>
  );
}
