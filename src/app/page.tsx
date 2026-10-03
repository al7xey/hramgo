import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, HeartHandshake } from "lucide-react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

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
            </div>
          </LiquidGlassCard>

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
              <Button asChild size="lg" className="mt-4 w-full">
                <Link href="/support">Поддержать проект</Link>
              </Button>
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
          </LiquidGlassCard>
        </aside>
      </div>
    </MobileShell>
  );
}
