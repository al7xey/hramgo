"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_CONSENT_KEY,
  METRIKA_COUNTER_ID,
  analyticsPageUrl
} from "@/lib/analytics";

type Consent = "granted" | "denied" | null;
type Counter = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global {
  interface Window {
    ym?: Counter;
  }
}

export function YandexMetrika() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const initialized = useRef(false);
  const lastUrl = useRef("");

  useEffect(() => {
    try {
      const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      if (value === "granted" || value === "denied") setConsent(value);
    } catch {
      /* The site also works with storage disabled. */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (consent !== "granted") {
      if (initialized.current) window.ym?.(METRIKA_COUNTER_ID, "destruct");
      initialized.current = false;
      lastUrl.current = "";
      return;
    }
    if (!window.ym) {
      const queue: Counter = (...args) => {
        (queue.a ??= []).push(args);
      };
      queue.l = Date.now();
      window.ym = queue;
    }
    const url = analyticsPageUrl(pathname);
    if (!initialized.current) {
      window.ym(METRIKA_COUNTER_ID, "init", {
        defer: true,
        webvisor: true,
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        url,
        referrer: document.referrer ? analyticsPageUrl(document.referrer) : ""
      });
      initialized.current = true;
    }
    if (lastUrl.current !== url) {
      window.ym(METRIKA_COUNTER_ID, "hit", url, {
        title: "HramGo — храмы Москвы",
        referer:
          lastUrl.current ||
          (document.referrer ? analyticsPageUrl(document.referrer) : "")
      });
      lastUrl.current = url;
    }
  }, [consent, pathname, ready]);

  function choose(value: Exclude<Consent, null>) {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    } catch {
      /* Session-only choice. */
    }
    setConsent(value);
    setSettingsOpen(false);
  }

  return (
    <>
      {ready && consent === "granted" && (
        <Script
          id="hramgo-metrika"
          src={`https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_COUNTER_ID}`}
          strategy="afterInteractive"
        />
      )}
      <div className="mt-2 text-sm">
        <button
          type="button"
          className="min-h-11 text-primary underline underline-offset-4"
          onClick={() => setSettingsOpen(true)}
        >
          Настройки аналитики
        </button>
      </div>
      {ready && (consent === null || settingsOpen) && (
        <section
          aria-label="Настройки аналитики"
          className="fixed inset-x-4 bottom-28 z-[70] mx-auto max-w-xl rounded-2xl border border-card-border bg-card p-4 shadow-glass md:bottom-6"
        >
          <p className="text-sm leading-6">
            Разрешить Яндекс Метрике собирать статистику посещений, включая
            запись действий на страницах? Данные платёжной формы скрыты.{" "}
            <Link href="/legal/privacy/" className="text-primary underline">
              Подробнее
            </Link>
          </p>
          <div className="mt-3 flex gap-3">
            <Button size="sm" onClick={() => choose("granted")}>
              Разрешить
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => choose("denied")}
            >
              Без аналитики
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
