"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { METRIKA_COUNTER_ID, analyticsPageUrl } from "@/lib/analytics";

type Counter = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global {
  interface Window {
    ym?: Counter;
  }
}

export function YandexMetrika() {
  const pathname = usePathname();
  const initialized = useRef(false);
  const lastUrl = useRef("");

  useEffect(() => {
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
        webvisor: false,
        clickmap: false,
        trackLinks: false,
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
  }, [pathname]);

  return (
    <Script
      id="hramgo-metrika"
      src={`https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_COUNTER_ID}`}
      strategy="afterInteractive"
    />
  );
}
