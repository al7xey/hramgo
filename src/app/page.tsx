import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  HeartHandshake,
  Map,
  Sunrise,
  Sunset
} from "lucide-react";
import { readCatalog } from "@/features/temples/repository";
import { regularServices } from "@/features/temples/schedules";

import { MobileShell } from "@/components/layout/mobile-shell";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { NearbyButton } from "@/components/temples/nearby-button";

export const metadata: Metadata = {
  title:
    "Найдите храм в Москве — поиск храмов, адреса, метро, МЦД и расписания",
  description:
    "HramGo помогает найти православный храм в Москве по названию, улице, району, метро, МЦД или ветке. В каталоге есть адреса, карта, расписания богослужений, контакты, фото и официальные сайты.",
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "Найдите храм в Москве — поиск храмов, метро, МЦД и расписания | HramGo",
    description:
      "Найдите православный храм Москвы по названию, улице, району, метро, МЦД или ветке: адреса, расписания, контакты, фото и карта.",
    url: "https://hramgo.ru",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "HramGo — поиск храмов Москвы"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Найдите храм в Москве — поиск храмов, метро, МЦД и расписания | HramGo",
    description:
      "Поиск храмов Москвы по названию, улице, району, метро, МЦД, ветке, расписанию и контактам.",
    images: ["/twitter-image"]
  }
};

export default async function HomePage() {
  const temples = await readCatalog();
  const withSchedule = temples.filter(
    (temple) => regularServices(temple.scheduleEntries ?? []).length
  ).length;
  return (
    <MobileShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid gap-6">
          <LiquidGlassCard className="p-4 md:p-6">
            <h1 className="page-title">Найдите храм в Москве</h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">
              Адреса, ближайшее метро, расписания богослужений и маршрут к
              храмам Москвы.
            </p>
            <div className="mt-5">
              <TempleSearchBar />
              <div className="mt-3">
                <NearbyButton />
              </div>
            </div>
          </LiquidGlassCard>

          <section className="px-4 md:px-6" aria-labelledby="quick-services">
            <h2 id="quick-services" className="section-title">
              Выберите время службы
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              По обычному расписанию храмов. День недели можно уточнить в
              фильтрах.
            </p>
            <div
              className="mt-4 grid gap-2 sm:grid-cols-2"
              aria-label="Быстрый поиск богослужений"
            >
              {[
                {
                  title: "Вечернее богослужение в 17:00",
                  kind: "evening",
                  from: "17:00",
                  to: "17:00"
                },
                {
                  title: "Вечернее богослужение в 18:00",
                  kind: "evening",
                  from: "18:00",
                  to: "18:00"
                },
                {
                  title: "Есть ранняя литургия",
                  kind: "liturgy",
                  from: "00:00",
                  to: "07:59"
                },
                {
                  title: "Литургия в 8:00",
                  kind: "liturgy",
                  from: "08:00",
                  to: "08:00"
                },
                {
                  title: "Литургия в 9:00",
                  kind: "liturgy",
                  from: "09:00",
                  to: "09:00"
                },
                {
                  title: "Литургия в 10:00",
                  kind: "liturgy",
                  from: "10:00",
                  to: "10:00"
                }
              ].map((scenario) => (
                <Button
                  key={scenario.title}
                  asChild
                  variant="outline"
                  className="h-auto min-h-12 justify-start gap-2 whitespace-normal px-3 py-3 text-left text-sm"
                >
                  <Link
                    href={`/temples/?scheduleMode=regular&worship=${scenario.kind}&timeFrom=${scenario.from}&timeTo=${scenario.to}`}
                    title={
                      scenario.from === "00:00" ? "Литургия до 8:00" : undefined
                    }
                  >
                    {scenario.kind === "evening" ? (
                      <Sunset className="size-4 shrink-0" aria-hidden />
                    ) : (
                      <Sunrise className="size-4 shrink-0" aria-hidden />
                    )}
                    {scenario.title}
                  </Link>
                </Button>
              ))}
            </div>
          </section>

          <section className="p-4 md:p-6" aria-labelledby="visit-guide">
            <h2 id="visit-guide" className="section-title">
              Куда пойти на богослужение
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Выберите время службы или найдите храм по станции метро. В
              карточке есть ближайшие станции и примерное время пути, а на
              странице храма — расписание, контакты и ссылка для построения
              маршрута.
            </p>
            <ol className="mt-5 grid gap-0 text-sm">
              {[
                [
                  "Найдите храм",
                  "Название, район, улица, метро или МЦД — начните с того, что знаете."
                ],
                [
                  "Выберите службу",
                  "Уточните день недели, время литургии или вечернего богослужения."
                ],
                [
                  "Постройте маршрут",
                  "Откройте страницу храма, сверяйте источник расписания и переходите в карты."
                ]
              ].map(([title, text], index) => (
                <li
                  key={title}
                  className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                >
                  {index < 2 && (
                    <span
                      className="absolute bottom-0 left-[15px] top-8 w-px bg-card-border"
                      aria-hidden
                    />
                  )}
                  <span className="relative flex size-8 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-4 gap-2">
              <Link href="/map/">
                <Map className="size-4" aria-hidden />
                Показать на карте
              </Link>
            </Button>
          </section>

          <section>
            <LiquidGlassCard className="p-4 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <HeartHandshake className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">
                    Помочь проекту стать полезнее
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Поддержка помогает проверять данные, добавлять новые
                    карточки, фотографии и улучшать карту.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="mt-4 w-full">
                <Link href="/support/">
                  <HeartHandshake className="size-5" aria-hidden />
                  Поддержать проект
                </Link>
              </Button>
            </LiquidGlassCard>
          </section>
        </section>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <LiquidGlassCard className="p-4 md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CalendarCheck className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">Перед посещением</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Сверяйте расписание и контакты по официальному сайту храма,
                  особенно перед поездкой в праздник.
                </p>
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-4 md:p-6">
            <h2 className="font-semibold">О проекте</h2>
            <div className="mt-3 grid gap-3 text-base leading-7 text-muted-foreground">
              <p>
                HramGo собирает открытые данные о православных храмах Москвы:
                адреса, ближайшие станции, контакты, фото и расписания.
              </p>
              <p>Информация обновляется из официальных источников.</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs leading-5 text-muted-foreground">
                  Храмов в каталоге
                </dt>
                <dd className="text-2xl font-semibold text-primary">
                  {temples.length}
                </dd>
              </div>
              <div>
                <dt className="text-xs leading-5 text-muted-foreground">
                  С обычным расписанием
                </dt>
                <dd className="text-2xl font-semibold text-primary">
                  {withSchedule}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Обычное расписание описывает службы по дням недели. В праздники
              время может меняться; источник и дата проверки указаны на странице
              храма. Знак ≈ у метро означает примерное время пути.
            </p>
          </LiquidGlassCard>
        </aside>
      </div>
    </MobileShell>
  );
}
