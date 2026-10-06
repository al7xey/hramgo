import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BookOpenText,
  ChevronDown,
  ExternalLink,
  History,
  ShieldCheck,
  Navigation,
  UsersRound
} from "lucide-react";
import { notFound } from "next/navigation";

import { LazyTempleMap } from "@/components/map/lazy-temple-map";
import { TempleSchedule } from "@/components/temples/temple-schedule";
import { BackToSearchButton } from "@/components/temples/back-to-search-button";
import { TempleGallery } from "@/components/temples/temple-gallery";
import { TransitSummary } from "@/components/temples/transit-chip";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import { getTempleBySlug, readCatalog } from "@/features/temples/repository";
import type {
  TempleParishServiceView,
  TempleView
} from "@/features/temples/types";
import { formatDate, routeToYandexMaps } from "@/lib/utils";
import { env } from "@/lib/env";
import { NextServiceSummary } from "@/components/temples/next-service-summary";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await readCatalog()).flatMap((t) =>
    [t.slug, ...(t.mergedSlugs ?? [])].map((slug) => ({ slug }))
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    return { title: "Храм не найден" };
  }

  const templeTitle = temple.shortName ?? temple.name;
  const address = formatTempleAddress(temple.address);
  const nearestTransit = temple.transit
    .slice(0, 2)
    .map((item) => item.station)
    .join(", ");
  const seoDescription = [
    `${templeTitle} в Москве`,
    address ? `адрес: ${address}` : null,
    nearestTransit ? `рядом: ${nearestTransit}` : null,
    "расписание богослужений, контакты, фото, карта и официальный сайт на HramGo"
  ]
    .filter(Boolean)
    .join(". ");

  return {
    title: `${templeTitle} — адрес, расписание, метро и контакты`,
    description: seoDescription,
    keywords: [
      temple.name,
      templeTitle,
      `${templeTitle} расписание`,
      `${templeTitle} адрес`,
      `${templeTitle} официальный сайт`,
      "храмы Москвы",
      "православные храмы Москвы",
      ...temple.transit
        .slice(0, 3)
        .map((item) => `храм рядом с ${item.station}`)
    ],
    alternates: {
      canonical: `/temples/${temple.slug}`
    },
    openGraph: {
      title: `${templeTitle} — адрес, расписание и контакты | HramGo`,
      description: seoDescription,
      url: `https://hramgo.ru/temples/${temple.slug}`,
      type: "article",
      images: temple.photos[0]?.imageUrl
        ? [
            {
              url: temple.photos[0].imageUrl,
              alt: temple.photos[0].alt ?? temple.name
            }
          ]
        : [
            {
              url: "/opengraph-image",
              width: 1200,
              height: 630,
              alt: `${templeTitle} на HramGo`
            }
          ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${templeTitle} — адрес, расписание и контакты | HramGo`,
      description: seoDescription,
      images: temple.photos[0]?.imageUrl
        ? [temple.photos[0].imageUrl]
        : ["/twitter-image"]
    }
  };
}

export default async function TemplePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    notFound();
  }

  const templeDescription = getTempleDescription(temple);
  const structuredData = getTempleStructuredData(temple);
  const displayAddress = formatTempleAddress(temple.address);

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c")
        }}
      />
      <section className="grid gap-6">
        <BackToSearchButton />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="order-2 lg:order-1">
            <TempleGallery photos={temple.photos} name={temple.name} />
          </div>

          <LiquidGlassCard className="order-1 grid content-start gap-4 p-4 md:p-6 lg:order-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="page-title">{temple.name}</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {displayAddress}
                </p>
              </div>
            </div>

            <TransitSummary transit={temple.transit} limit={3} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild>
                <a
                  href={routeToYandexMaps(
                    temple.address,
                    temple.latitude,
                    temple.longitude
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="size-5" aria-hidden />
                  Построить маршрут
                </a>
              </Button>
              {temple.websiteUrl && (
                <Button asChild variant="outline">
                  <a href={temple.websiteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-5" aria-hidden />
                    Сайт храма
                  </a>
                </Button>
              )}
            </div>
            <NextServiceSummary entries={temple.scheduleEntries ?? []} />
            <Button asChild variant="ghost" className="justify-start px-0">
              <a
                href={
                  "mailto:" +
                  env.SUPPORT_EMAIL +
                  "?subject=" +
                  encodeURIComponent("Ошибка в данных: " + temple.name) +
                  "&body=" +
                  encodeURIComponent(
                    "Храм: " +
                      temple.name +
                      "\nСтраница: https://hramgo.ru/temples/" +
                      temple.slug +
                      "/\n\nЧто нужно исправить:\n"
                  )
                }
              >
                Сообщить об ошибке
              </a>
            </Button>
          </LiquidGlassCard>
        </div>

        <div className="grid gap-3">
          <DetailsCard
            title="Расписание богослужений"
            defaultOpen
            icon={<BookOpenText className="size-5" aria-hidden />}
          >
            <TempleSchedule temple={temple} />
          </DetailsCard>

          <DetailsCard
            title="Социальные сети и контакты"
            icon={<ExternalLink className="size-5" aria-hidden />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaLine label="Телефон" value={temple.phone} contact="phone" />
              <MetaLine label="Email" value={temple.email} contact="email" />
            </div>
            {temple.socialLinks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {temple.socialLinks.map((link, index) => (
                  <a
                    key={`${link.type}-${link.label}-${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-transparent bg-primary-soft px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </DetailsCard>

          <DetailsCard
            title="История, святыни и фото"
            icon={<History className="size-5" aria-hidden />}
          >
            {templeDescription && (
              <InfoBlock title="О храме" text={templeDescription} />
            )}
            {temple.descriptionSourceUrl && (
              <a
                href={temple.descriptionSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Источник сведений о храме
              </a>
            )}
            <InfoBlock
              title="История"
              text={
                temple.historySummary ??
                temple.description ??
                "История храма пока не добавлена."
              }
            />
            <InfoBlock
              title="Святыни и особенности"
              text={
                temple.shrines ??
                "Сведения о святынях и особенностях лучше уточнить на официальном сайте."
              }
            />
            <LinkRow href={temple.websiteUrl} label="Подробнее на сайте" />
          </DetailsCard>

          <DetailsCard
            title="Духовенство"
            icon={<UsersRound className="size-5" aria-hidden />}
          >
            {temple.clergy.length > 0 ? (
              <div className="grid gap-2">
                {temple.clergy.map((person) => (
                  <div
                    key={`${person.name}-${person.role}`}
                    className="rounded-[20px] bg-muted p-4"
                  >
                    <p className="font-semibold">{person.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[person.rank, person.role].filter(Boolean).join(" · ")}
                    </p>
                    {person.details && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {person.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Информация о духовенстве пока не добавлена.
              </p>
            )}
          </DetailsCard>

          <ParishServicesOverview temple={temple} />

          <DetailsCard
            title="Служебная информация"
            icon={<ShieldCheck className="size-5" aria-hidden />}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaLine label="Район" value={temple.district} />
              <MetaLine label="Тип объекта" value={temple.objectType} />
              <MetaLine label="Благочиние" value={temple.deanery} />
              <MetaLine label="Викариатство" value={temple.vicariate} />
              <MetaLine
                label="Дата проверки"
                value={formatDate(temple.lastVerifiedAt)}
              />
            </div>
          </DetailsCard>
        </div>
      </section>
      <section className="grid gap-3">
        <h2 className="section-title">Как добраться</h2>
        <LazyTempleMap
          temples={[temple]}
          activeSlug={temple.slug}
          showPreview={false}
        />
      </section>
    </div>
  );
}

function DetailsCard({
  title,
  icon,
  children,
  defaultOpen = false
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="details-panel glass rounded-glass p-4 md:p-6"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        <ChevronDown className="size-5 text-muted-foreground" aria-hidden />
      </summary>
      <div className="mt-4 grid max-w-[880px] gap-4">{children}</div>
    </details>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  );
}

function MetaLine({
  label,
  value,
  contact
}: {
  label: string;
  value?: string | null;
  contact?: "phone" | "email";
}) {
  return (
    <div className="rounded-[20px] bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      {value && contact ? (
        <div className="mt-1 grid gap-1 text-sm font-medium">
          {value.split(/[,;]/).map((item, i) => (
            <a
              key={i}
              className="inline-flex min-h-11 items-center break-all text-action underline"
              href={
                contact === "phone"
                  ? `tel:${item.replace(/[^+\d]/g, "")}`
                  : `mailto:${item.trim()}`
              }
            >
              {item.trim()}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-medium">{value ?? "не указано"}</p>
      )}
    </div>
  );
}

function LinkRow({
  href,
  label,
  fullWidth = false
}: {
  href?: string | null;
  label: string;
  fullWidth?: boolean;
}) {
  if (!href) {
    return null;
  }

  return (
    <Button
      asChild
      variant="outline"
      className={fullWidth ? "w-full" : "w-full sm:w-fit"}
    >
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink className="size-5" aria-hidden />
        {label}
      </a>
    </Button>
  );
}

const serviceOverviewKinds: TempleParishServiceView["kind"][] = [
  "sundaySchool",
  "youth",
  "social",
  "meetings"
];

function ParishServicesOverview({ temple }: { temple: TempleView }) {
  return (
    <DetailsCard
      title="При храме"
      icon={<BookOpenText className="size-5" aria-hidden />}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {serviceOverviewKinds.map((kind) => {
          const service = temple.parishServices.find(
            (item) => item.kind === kind
          );
          const description =
            kind === "sundaySchool"
              ? temple.sundaySchoolDescription || service?.description
              : service?.description;
          const sourceUrl =
            kind === "sundaySchool"
              ? temple.sundaySchoolSourceUrl || service?.sourceUrl
              : service?.sourceUrl;

          return (
            <details
              key={kind}
              className="details-panel rounded-[22px] bg-muted/70 p-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <h3 className="font-semibold">{getParishServiceLabel(kind)}</h3>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {description || "Информация уточняется."}
              </p>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-action underline"
                >
                  Источник
                </a>
              )}
            </details>
          );
        })}
      </div>
    </DetailsCard>
  );
}

function formatTempleAddress(address?: string | null) {
  const normalized = (address ?? "")
    .replace(/^\s*\d{6},?\s*/u, "")
    .replace(/^(г\.?\s*)?Москва,?\s*/iu, "")
    .replace(/^(город\s*)?Москва,?\s*/iu, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(Московский\s+)?Кремль\.?$/iu.test(normalized)) {
    return "";
  }

  return normalized;
}

function getTempleDescription(temple: TempleView) {
  return temple.description?.trim() || temple.historySummary?.trim() || null;
}

function getTempleStructuredData(temple: TempleView) {
  const address = formatTempleAddress(temple.address);
  const description = getTempleDescription(temple);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Church",
        "@id": `https://hramgo.ru/temples/${temple.slug}#church`,
        name: temple.name,
        alternateName: temple.shortName ?? undefined,
        description: description ?? undefined,
        url: `https://hramgo.ru/temples/${temple.slug}`,
        image: temple.photos.map((photo) => photo.imageUrl).slice(0, 8),
        telephone: temple.phone ?? undefined,
        email: temple.email ?? undefined,
        address: address
          ? {
              "@type": "PostalAddress",
              streetAddress: address,
              addressLocality: "Москва",
              addressCountry: "RU"
            }
          : undefined,
        geo:
          temple.latitude && temple.longitude
            ? {
                "@type": "GeoCoordinates",
                latitude: temple.latitude,
                longitude: temple.longitude
              }
            : undefined,
        sameAs: temple.socialLinks.map((link) => link.url)
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://hramgo.ru/temples/${temple.slug}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Главная",
            item: "https://hramgo.ru"
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Храмы Москвы",
            item: "https://hramgo.ru/temples"
          },
          {
            "@type": "ListItem",
            position: 3,
            name: temple.shortName ?? temple.name,
            item: `https://hramgo.ru/temples/${temple.slug}`
          }
        ]
      }
    ]
  };
}
