import type { Metadata } from "next";
import { Suspense } from "react";
import { MapBrowser } from "@/components/map/map-browser";
export const metadata: Metadata = {
  title: "Карта и поиск храмов Москвы — храмы рядом с метро, МЦД и маршрут",
  description:
    "Интерактивная карта православных храмов Москвы: поиск храма рядом, адреса, ближайшее метро и МЦД, храмы на ветке метро или МЦД, маршруты, официальные сайты, фото и контакты.",
  keywords: [
    "карта храмов Москвы",
    "поиск храмов Москвы на карте",
    "поиск храмов Москва",
    "храм рядом",
    "церковь рядом",
    "храмы рядом с метро",
    "храмы рядом с МЦД",
    "храмы на ветке метро",
    "храмы на ветке МЦД",
    "маршрут до храма",
    "православные храмы Москвы"
  ],
  alternates: { canonical: "/map" },
  openGraph: {
    title: "Карта и поиск храмов Москвы — найти храм рядом | HramGo",
    description: "Найдите православный храм Москвы на карте по названию, улице, району, метро, МЦД или ветке; откройте адрес, маршрут, контакты и официальный сайт.",
    url: "https://hramgo.ru/map",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Карта храмов Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Карта и поиск храмов Москвы — найти храм рядом | HramGo",
    description: "Храмы Москвы на карте: адреса, метро, МЦД, ветки, маршруты, фото и контакты.",
    images: ["/twitter-image"]
  }
};

export default function MapPage(){return <Suspense fallback={<p>Загрузка карты…</p>}><MapBrowser/></Suspense>;}
