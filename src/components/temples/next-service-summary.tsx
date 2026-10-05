"use client";
import { useEffect, useState } from "react";
import { nextService, serviceDateLabel } from "@/features/temples/worship";
import { formatDate } from "@/lib/utils";
import type { ScheduleEntry } from "@/features/temples/types";
export function NextServiceSummary({ entries }: { entries: ScheduleEntry[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const next = now ? nextService(entries, now) : undefined;
  return (
    <section className="rounded-[22px] bg-primary-soft p-4" aria-live="polite">
      <h2 className="text-sm font-semibold">Ближайшее богослужение</h2>
      {!now ? (
        <p className="mt-2 text-sm">Проверяем ближайшие службы…</p>
      ) : next ? (
        <>
          <p className="mt-2 font-semibold">
            {serviceDateLabel(next.date, now)} ·{" "}
            {next.entry.startsAt.slice(0, 5)} — {next.entry.title}
          </p>
          {next.entry.scopeNote && (
            <p className="mt-1 text-sm">{next.entry.scopeNote}</p>
          )}
          <a
            className="mt-2 inline-block text-xs text-action underline"
            href={next.entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Источник · проверено {formatDate(next.entry.verifiedAt)}
          </a>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6">
          Актуальное расписание ближайших служб уточняется. Ниже есть обычное
          расписание и источники; перед поездкой сверьте время с приходом.
        </p>
      )}
    </section>
  );
}
