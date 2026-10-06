"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

export function PaymentStatus() {
  const params = useSearchParams();
  const requestId = params.get("payment");
  const [result, setResult] = useState<{
    status?: string;
    message?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!requestId) return;
    const controller = new AbortController();
    let cancelled = false;
    setBusy(true);
    setResult(null);
    const timer = setTimeout(() => controller.abort(), 25000);
    fetch("/api/support/payment-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId }),
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Не удалось проверить оплату.");
        if (!cancelled) setResult(data);
      })
      .catch((error) => {
        if (!cancelled)
          setResult({
            message:
              error.name === "AbortError"
                ? "Проверка занимает больше времени. Попробуйте ещё раз."
                : error.message
          });
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestId, retry]);
  if (!requestId) return null;
  const paid = result?.status === "succeeded";
  const canceled = result?.status === "canceled";
  return (
    <LiquidGlassCard
      className="grid gap-3 p-5"
      role="status"
      aria-live="polite"
      aria-busy={busy}
    >
      <h2 className="text-xl font-semibold">
        {busy
          ? "Проверяем оплату"
          : paid
            ? "Спасибо за поддержку!"
            : canceled
              ? "Платёж отменён"
              : "Статус платежа"}
      </h2>
      <p className="text-sm leading-6 text-muted-foreground">
        {busy
          ? "Получаем подтверждение от ЮKassa…"
          : result?.message ||
            (paid
              ? "ЮKassa подтвердила оплату. Ваша поддержка помогает развивать HramGo."
              : canceled
                ? "Оплата не завершена. При желании можно попробовать снова."
                : "Оплата пока не подтверждена. Завершите её на странице ЮKassa или проверьте статус позже.")}
      </p>
      {!paid && !canceled && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => setRetry((value) => value + 1)}
        >
          Проверить статус
        </Button>
      )}
    </LiquidGlassCard>
  );
}
