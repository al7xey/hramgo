import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/temples/catalog-browser";
export const metadata: Metadata = {
  title: "Поиск храмов Москвы — храмы рядом с метро, МЦД, адреса и расписания",
  description:
    "HramGo — каталог и поиск православных храмов Москвы по названию, улице, району, адресу, метро, МЦД, ветке метро, расписанию богослужений, фото, контактам и официальным сайтам.",
  keywords: [
    "храмы Москвы",
    "православные храмы Москвы",
    "поиск храмов",
    "поиск храмов Москвы",
    "храм рядом",
    "храмы рядом с метро",
    "храмы рядом с МЦД",
    "храмы на ветке метро",
    "храмы на ветке МЦД",
    "храмы возле метро Москва",
    "найти храм в Москве",
    "расписание храма",
    "расписание богослужений в храме",
    "церкви Москвы",
    "московские храмы"
  ],
  alternates: { canonical: "/temples" },
  openGraph: {
    title: "Поиск храмов Москвы — адреса, метро, МЦД и расписания | HramGo",
    description: "Найдите храм Москвы по названию, улице, району, станции метро, МЦД или ветке: адреса, расписания богослужений, контакты и фото.",
    url: "https://hramgo.ru/temples",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Каталог храмов Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Поиск храмов Москвы — адреса, метро, МЦД и расписания | HramGo",
    description: "Каталог храмов Москвы с поиском по улице, району, метро, МЦД, ветке, расписанию, фото и контактам.",
    images: ["/twitter-image"]
  }
};

export default function TemplesPage(){return <Suspense fallback={<p>Загрузка каталога…</p>}><CatalogBrowser/></Suspense>;}
