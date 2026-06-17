import type { Metadata } from "next";
import { MobileShell } from "@/components/layout/mobile-shell";
import { TempleFilters } from "@/components/temples/temple-filters";
import { TempleInfiniteList } from "@/components/temples/temple-infinite-list";
import { TempleSearchBar } from "@/components/temples/temple-search-bar";
import { getDistricts, getMetroLines, getMetroOptions, getParishServiceKinds, listTemples } from "@/features/temples/repository";
import { templeSearchSchema, type TempleSearchSchema } from "@/features/temples/validation";

export const metadata: Metadata = {
  title: "Храмы Москвы — каталог, расписание, адреса и метро",
  description:
    "Каталог православных храмов Москвы: поиск по названию, адресу, району, метро, МЦД, расписанию богослужений, фото и приходской жизни.",
  keywords: ["храмы Москвы", "православные храмы Москвы", "расписание храма", "богослужения в храме", "храмы рядом с метро", "церкви Москвы"],
  alternates: { canonical: "/temples" },
  openGraph: {
    title: "Храмы Москвы — каталог и расписание | HramGo",
    description: "Найдите православный храм в Москве по адресу, метро, МЦД, расписанию богослужений и контактам.",
    url: "https://hramgo.ru/temples",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Каталог храмов Москвы" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Храмы Москвы — каталог и расписание | HramGo",
    description: "Каталог храмов Москвы с расписанием, адресами, метро, МЦД, фото и контактами.",
    images: ["/twitter-image"]
  }
};

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
    sundaySchool: getParam(params, "sundaySchool"),
    hasSchedule: getParam(params, "hasSchedule"),
    hasWebsite: getParam(params, "hasWebsite"),
    hasPhotos: getParam(params, "hasPhotos"),
    childFriendly: getParam(params, "childFriendly"),
    hasParking: getParam(params, "hasParking"),
    sort: getParam(params, "sort")
  });
  const allTemples = await listTemples({});

  return (
    <MobileShell>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="grid gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">Поиск храмов</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Название, район, станции, линии метро и приходские направления.
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
          <TempleInfiniteList searchParams={normalizeSearchParams(parsed)} />
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
