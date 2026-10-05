"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import type { TempleView } from "@/features/temples/types";
import { servicesForDate, regularServices } from "@/features/temples/schedules";
import { formatDate } from "@/lib/utils";
import { offsetMoscowDate, serviceDateLabel } from "@/features/temples/worship";

export function TempleSchedule({
  temple
}: {
  temple: Pick<
    TempleView,
    | "scheduleSummary"
    | "scheduleEntries"
    | "scheduleSourceUrl"
    | "websiteUrl"
    | "lastVerifiedAt"
  >;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const groups = now
    ? Array.from({ length: 7 }, (_, i) => {
        const day = offsetMoscowDate(i, now);
        return {
          day,
          entries: servicesForDate(temple.scheduleEntries ?? [], day, now)
        };
      }).filter((group) => group.entries.length)
    : [];
  const source = temple.scheduleSourceUrl ?? temple.websiteUrl;
  const sourceIsDirectory = Boolean(source?.includes("sprav.moseparh.ru"));
  const weekly = regularServices(temple.scheduleEntries ?? []);
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return (
    <div className="grid gap-3">
      {weekly.length > 0 && (
        <section className="rounded-[22px] bg-muted/70 p-4">
          <h3 className="font-semibold">Обычное расписание</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            В праздники и особые дни время может меняться. Справочные записи
            уточняйте в приходе.
          </p>
          <div className="mt-3 grid gap-2">
            {weekly.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[16px] bg-background/70 p-3 text-sm"
              >
                <p className="font-semibold">
                  {entry.weekdays?.length === 7
                    ? "Ежедневно"
                    : entry.weekdays
                        ?.map((day) => weekdays[day - 1])
                        .join(", ") || "Дни уточняются"}
                </p>
                <p className="mt-1">
                  <time className="mr-2 font-semibold">
                    {entry.startsAt.slice(0, 5)}
                  </time>
                  {entry.title}
                </p>
                {entry.scopeNote && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.scopeNote}
                  </p>
                )}
                {entry.comment && (
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      Примечание источника
                    </summary>
                    <p className="mt-1 leading-5">{entry.comment}</p>
                  </details>
                )}
                <a
                  href={entry.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-action underline"
                >
                  {entry.status === "REVIEW"
                    ? "Справочно · источник получен"
                    : "Источник · проверено"}{" "}
                  {formatDate(entry.verifiedAt)}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
      {groups.length > 0 && (
        <h3 className="font-semibold">Ближайшие службы по датам</h3>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {groups.length ? (
          groups.map((group) => (
            <div key={group.day} className="rounded-[22px] bg-muted/70 p-4">
              <h3 className="text-sm font-semibold">
                {serviceDateLabel(group.day, now ?? undefined)}
              </h3>
              <div className="mt-3 grid gap-2">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-3 rounded-[16px] bg-background/70 p-3"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Clock3 className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 text-sm leading-6 text-muted-foreground">
                      <p>
                        <time className="mr-2 font-semibold text-foreground">
                          {entry.startsAt.slice(0, 5)}
                        </time>
                        {entry.title}
                      </p>
                      {entry.scopeNote && (
                        <p className="mt-1 text-xs">{entry.scopeNote}</p>
                      )}
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-action underline"
                      >
                        Источник · проверено {formatDate(entry.verifiedAt)}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : weekly.length ? null : (
          <div className="rounded-[22px] bg-muted/70 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {now
                ? "Актуальное расписание уточняется."
                : "Загрузка расписания…"}
            </p>
          </div>
        )}
      </div>
      <div className="rounded-[22px] bg-primary-soft p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Перед поездкой проверьте актуальное расписание на официальном сайте
          храма или по контактам прихода.
        </p>
      </div>
      {source && (
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm font-medium text-action underline"
        >
          {sourceIsDirectory
            ? "Сведения в справочнике Московской епархии"
            : "Расписание на сайте храма"}
        </a>
      )}
      {temple.scheduleSummary && (
        <details className="details-panel rounded-[22px] bg-muted/70 p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Сведения из справочника
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {temple.scheduleSummary}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Справочные сведения могут быть устаревшими. Подтверждённые службы и
            обычные справочные правила показаны отдельно; перед поездкой
            сверяйте источник.
          </p>
        </details>
      )}
    </div>
  );
}
