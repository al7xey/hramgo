import type { Metadata } from "next";
import { TempleMap } from "@/components/map/temple-map";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { getNearestTransitList } from "@/features/temples/transit";
import { listMapTemples } from "@/features/temples/repository";
import { templeSearchSchema } from "@/features/temples/validation";

export const metadata: Metadata = {
  title: "Карта храмов Москвы — поиск по адресу, метро и МЦД",
  description:
    "Интерактивная карта православных храмов Москвы: реальные адреса, ближайшее метро и МЦД, маршруты, официальные сайты и контакты.",
  keywords: ["карта храмов Москвы", "храм рядом", "церковь рядом", "храмы рядом с метро", "православные храмы Москвы"],
  alternates: { canonical: "/map" },
  openGraph: {
    title: "Карта храмов Москвы | HramGo",
    description: "Найдите ближайший православный храм Москвы на карте, посмотрите адрес, метро, МЦД и маршрут.",
    url: "https://hramgo.ru/map",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Карта храмов Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Карта храмов Москвы | HramGo",
    description: "Храмы Москвы на карте: адреса, метро, МЦД, маршруты и контакты.",
    images: ["/twitter-image"]
  }
};

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const parsed = templeSearchSchema.parse({
    query: getParam(params, "query"),
    metro: params.metro,
    metroLine: params.metroLine,
    service: params.service,
    hasSchedule: getParam(params, "hasSchedule"),
    hasWebsite: getParam(params, "hasWebsite"),
    hasPhotos: getParam(params, "hasPhotos")
  });
  const temples = (await listMapTemples(parsed))
    .filter((temple) => temple.latitude && temple.longitude)
    .map((temple) => ({
      id: temple.id,
      slug: temple.slug,
      name: temple.name,
      shortName: temple.shortName,
      address: temple.address,
      latitude: temple.latitude,
      longitude: temple.longitude,
      websiteUrl: temple.websiteUrl,
      photos: temple.photos.slice(0, 1),
      transit: getNearestTransitList(temple.transit, 2)
    }));

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Карта храмов Москвы</h1>
        <p className="mt-2 text-sm text-muted-foreground">Показано храмов: {temples.length}</p>
      </div>
      <TempleMap
        temples={temples}
        activeSlug={getParam(params, "temple")}
        sidebarTop={<TempleSearchBar action="/map" defaultValue={parsed.query} />}
      />
    </div>
  );
}
