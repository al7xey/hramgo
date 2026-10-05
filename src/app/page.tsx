import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  Clock3,
  HeartHandshake,
  Map,
  Sunrise
} from "lucide-react";
import { readCatalog } from "@/features/temples/repository";
import { regularServices } from "@/features/temples/schedules";

import { MobileShell } from "@/components/layout/mobile-shell";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { NearbyButton } from "@/components/temples/nearby-button";
import { TodayLink } from "@/components/temples/today-link";

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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid gap-5">
          <LiquidGlassCard className="p-5 md:p-7 lg:p-8">
            <h1 className="max-w-4xl break-words text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Найдите храм в Москве
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
              Введите название, улицу, район, станцию метро или МЦД. HramGo
              покажет ближайшие храмы, адреса, расписания и маршрут.
            </p>
            <div className="mt-5">
              <TempleSearchBar />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <NearbyButton />
                <TodayLink />
              </div>
            </div>
            <div
              className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
              aria-label="Быстрый поиск богослужений"
            >
              {[
                { title: "Вечерняя в 17:00", kind: "evening", time: "17:00" },
                { title: "Вечерняя в 18:00", kind: "evening", time: "18:00" },
                { title: "Литургия в 8:00", kind: "liturgy", time: "08:00" },
                { title: "Литургия в 9:00", kind: "liturgy", time: "09:00" }
              ].map((scenario) => (
                <Button
                  key={scenario.title}
                  asChild
                  size="sm"
                  variant="outline"
                  className="gap-1.5 px-2 text-xs sm:px-3"
                >
                  <Link
                    href={`/temples/?scheduleMode=regular&worship=${scenario.kind}&timeFrom=${scenario.time}&timeTo=${scenario.time}`}
                  >
                    {scenario.kind === "evening" ? (
                      <Clock3 className="size-4" aria-hidden />
                    ) : (
                      <Sunrise className="size-4" aria-hidden />
                    )}
                    {scenario.title}
                  </Link>
                </Button>
              ))}
            </div>
          </LiquidGlassCard>

          <section className="px-1 py-2 md:px-3" aria-labelledby="visit-guide">
            <h2 id="visit-guide" className="text-xl font-semibold">
              Куда пойти на богослужение
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Выберите время службы или найдите храм по станции метро. В
              карточке есть ближайшие станции и примерное время пути, а на
              странице храма — расписание, контакты и ссылка для построения
              маршрута.
            </p>
            <ol className="mt-4 grid gap-3 border-y border-card-border py-4 text-sm sm:grid-cols-3">
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
                <li key={title}>
                  <p className="font-semibold">
                    <span className="mr-2 text-primary">{index + 1}.</span>
                    {title}
                  </p>
                  <p className="mt-1 leading-6 text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-4 gap-2">
              <Link href="/map/">
                <Map className="size-4" aria-hidden />
                Храмы на карте Москвы
              </Link>
            </Button>
          </section>

          <section>
            <LiquidGlassCard className="p-5">
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
              <p className="mt-4 text-sm text-muted-foreground">
                Приём добровольной поддержки пока недоступен.
              </p>
            </LiquidGlassCard>
          </section>
        </section>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <LiquidGlassCard className="p-5">
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

          <LiquidGlassCard className="p-5">
            <h2 className="font-semibold">О проекте</h2>
            <div className="mt-3 grid gap-3 text-base leading-7 text-muted-foreground">
              <p>
                HramGo собирает открытые данные о православных храмах Москвы:
                адреса, ближайшие станции, контакты, фото и расписания.
              </p>
              <p>Информация обновляется из официальных источников.</p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-card-border pt-4">
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
