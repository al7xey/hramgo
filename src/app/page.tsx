import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, HeartHandshake, MapPin } from "lucide-react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { TempleCard } from "@/components/temples/temple-card";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { listMapTemples } from "@/features/temples/repository";

export const metadata: Metadata = {
  title: "Поиск храмов Москвы — адреса, расписания, метро и МЦД",
  description:
    "HramGo помогает найти православный храм в Москве по названию, улице, району, метро или МЦД. В каталоге есть адреса, карта, расписания богослужений, контакты, фото и официальные сайты.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Поиск храмов Москвы — адреса, расписания, метро и МЦД | HramGo",
    description: "Найдите православный храм Москвы по названию, улице, району, метро или МЦД: адреса, расписания, контакты, фото и карта.",
    url: "https://hramgo.ru",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "HramGo — поиск храмов Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Поиск храмов Москвы — адреса, расписания, метро и МЦД | HramGo",
    description: "Поиск храмов Москвы по названию, улице, району, метро, МЦД, расписанию и контактам.",
    images: ["/twitter-image"]
  }
};

export const revalidate = 300;

export default async function HomePage() {
  const temples = await listMapTemples({ sort: "impressions" });
  const reviewedTemples = temples.filter((temple) => temple.approvedReviewsCount > 0);
  const fallbackTemples = [...temples].sort((a, b) => (a.shortName ?? a.name).localeCompare(b.shortName ?? b.name, "ru"));
  const featuredTemples = (reviewedTemples.length > 0 ? reviewedTemples : fallbackTemples).slice(0, 3);

  return (
    <MobileShell>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="grid gap-5">
          <LiquidGlassCard className="p-5 md:p-7 lg:p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPin className="size-4" aria-hidden />
              HramGo
            </div>
            <h1 className="mt-5 max-w-4xl break-words text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Найдите храм в Москве
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
              Введите название, улицу, район, станцию метро или МЦД. HramGo покажет ближайшие храмы, адреса, расписания и маршрут.
            </p>
            <div className="mt-5">
              <TempleSearchBar />
            </div>
          </LiquidGlassCard>

          <section className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Популярные храмы</h2>
              <Button asChild variant="outline" size="icon" className="size-11 rounded-full">
                <Link href="/temples">
                  <span className="sr-only">Смотреть все храмы</span>
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4">
              {featuredTemples.map((temple) => (
                <TempleCard key={temple.id} temple={temple} />
              ))}
            </div>
          </section>

          <section>
            <LiquidGlassCard className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <HeartHandshake className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">Помочь проекту стать полезнее</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Поддержка помогает проверять данные, добавлять новые карточки, фотографии и улучшать карту.
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
                  Сверяйте расписание и контакты по официальному сайту храма, особенно перед поездкой в праздник.
                </p>
              </div>
            </div>
          </LiquidGlassCard>

          <LiquidGlassCard className="p-5">
            <h2 className="font-semibold">О проекте</h2>
            <div className="mt-3 grid gap-3 text-base leading-7 text-muted-foreground">
              <p>HramGo собирает открытые данные о православных храмах Москвы: адреса, ближайшие станции, контакты, фото и расписания.</p>
              <p>Информация обновляется из официальных источников и дополняется отзывами пользователей.</p>
            </div>
          </LiquidGlassCard>
        </aside>
      </div>
    </MobileShell>
  );
}
