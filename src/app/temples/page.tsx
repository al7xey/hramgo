import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { LazyTempleInfiniteList } from "@/components/temples/lazy-temple-infinite-list";
import { TempleFilters } from "@/components/temples/temple-filters";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { getDistricts, getMetroLines, getMetroOptions, getParishServiceKinds, listMapTemples } from "@/features/temples/repository";
import { templeSearchSchema, type TempleSearchSchema } from "@/features/temples/validation";

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

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getParams(params: SearchParams, key: string) {
  const value = params[key];
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

export default async function TemplesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const parsed = templeSearchSchema.parse({
    query: getParam(params, "query"),
    district: getParams(params, "district"),
    metro: getParams(params, "metro"),
    metroLine: getParams(params, "metroLine"),
    service: getParams(params, "service"),
    objectType: getParam(params, "objectType"),
    liturgyTime: getParam(params, "liturgyTime"),
    eveningTime: getParam(params, "eveningTime"),
    sundaySchool: getParam(params, "sundaySchool"),
    hasSchedule: getParam(params, "hasSchedule"),
    hasWebsite: getParam(params, "hasWebsite"),
    hasPhotos: getParam(params, "hasPhotos"),
    childFriendly: getParam(params, "childFriendly"),
    hasParking: getParam(params, "hasParking"),
    sort: getParam(params, "sort")
  });
  const allTemples = await listMapTemples({});

  return (
    <MobileShell>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="grid gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">Поиск храмов Москвы</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ищите по названию, улице, району, метро, МЦД, ветке метро, расписанию и приходской деятельности.
            </p>
          </div>
          <TempleSearchBar defaultValue={parsed.query} autoFocus />
          <TempleFilters
            districts={getDistricts(allTemples)}
            metros={getMetroOptions(allTemples)}
            metroLines={getMetroLines()}
            serviceKinds={getParishServiceKinds(allTemples)}
            defaultValues={{
              query: parsed.query,
              districts: parsed.district ?? [],
              metros: parsed.metro ?? [],
              metroLines: parsed.metroLine ?? [],
              services: parsed.service ?? [],
              objectType: parsed.objectType ?? "all",
              liturgyTime: parsed.liturgyTime,
              eveningTime: parsed.eveningTime,
              sundaySchool: String(parsed.sundaySchool ?? false),
              hasSchedule: String(parsed.hasSchedule ?? false),
              hasWebsite: String(parsed.hasWebsite ?? false),
              hasPhotos: String(parsed.hasPhotos ?? false),
              childFriendly: String(parsed.childFriendly ?? false),
              hasParking: String(parsed.hasParking ?? false)
            }}
          />
        </aside>

        <section className="grid gap-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
          <LazyTempleInfiniteList searchParams={normalizeSearchParams(parsed)} />
        </section>
      </div>
    </MobileShell>
  );
}

function normalizeSearchParams(parsed: TempleSearchSchema) {
  const normalized: Record<string, string | string[] | undefined> = {};

  Object.entries(parsed).forEach(([key, value]) => {
    if (value === undefined || value === false || value === "") {
      return;
    }

    normalized[key] = Array.isArray(value) ? value : String(value);
  });

  return normalized;
}
