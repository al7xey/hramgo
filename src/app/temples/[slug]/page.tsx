import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenText, ChevronDown, ExternalLink, History, Map, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { LazyTempleMap } from "@/components/map/lazy-temple-map";
import { TempleReviews } from "@/components/reviews/temple-reviews";
import { TempleSchedule } from "@/components/temples/temple-schedule";
import { BackToSearchButton } from "@/components/temples/back-to-search-button";
import { TempleGallery } from "@/components/temples/temple-gallery";
import { SuggestCorrection } from '@/components/temples/suggest-correction';
import { TransitSummary } from "@/components/temples/transit-chip";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import { getTempleBySlug, readCatalog } from "@/features/temples/repository";
import type { TempleParishServiceView, TempleView } from "@/features/temples/types";
import { formatDate } from "@/lib/utils";

export const dynamicParams=false;
export async function generateStaticParams(){return (await readCatalog()).map(t=>({slug:t.slug}));}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
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
      ...temple.transit.slice(0, 3).map((item) => `храм рядом с ${item.station}`)
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
        ? [{ url: temple.photos[0].imageUrl, alt: temple.photos[0].alt ?? temple.name }]
        : [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${templeTitle} на HramGo` }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${templeTitle} — адрес, расписание и контакты | HramGo`,
      description: seoDescription,
      images: temple.photos[0]?.imageUrl ? [temple.photos[0].imageUrl] : ["/twitter-image"]
    }
  };
}

export default async function TemplePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    notFound();
  }

  const mapHref=`/map/?temple=${temple.slug}`;
  const reviewsHref=`/temples/${temple.slug}/reviews/`;
  const structuredData = getTempleStructuredData(temple);
  const displayAddress = formatTempleAddress(temple.address);
  const templeDescription = getTempleDescription(temple);

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g,"\\u003c") }} />
      <section className="grid gap-5">
        <BackToSearchButton />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <TempleGallery photos={temple.photos} name={temple.name} />

          <LiquidGlassCard className="grid content-start gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-semibold leading-tight md:text-3xl">{temple.name}</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{displayAddress}</p>
              </div>
              <FavoriteButton templeId={temple.id} compact />
            </div>

            <TransitSummary transit={temple.transit} limit={3} />

            {templeDescription && <p className="text-sm leading-7 text-muted-foreground">{templeDescription}</p>}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link href={mapHref}>
                  <Map className="size-5" aria-hidden />
                  Карта
                </Link>
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
          </LiquidGlassCard>
        </div>

        <div className="grid gap-3">
          <DetailsCard title="Расписание богослужений" defaultOpen icon={<BookOpenText className="size-5" aria-hidden />}>
            <TempleSchedule temple={temple}/>
          </DetailsCard>

          <DetailsCard title="История, святыни и фото" icon={<History className="size-5" aria-hidden />}>
            <InfoBlock title="История" text={temple.historySummary ?? temple.description ?? "История храма пока не добавлена."} />
            <InfoBlock
              title="Святыни и особенности"
              text={temple.shrines ?? "Сведения о святынях и особенностях лучше уточнить на официальном сайте."}
            />
            <LinkRow href={temple.websiteUrl} label="Подробнее на сайте" />
          </DetailsCard>

          <DetailsCard title="Духовенство" icon={<UsersRound className="size-5" aria-hidden />}>
            {temple.clergy.length > 0 ? (
              <div className="grid gap-2">
                {temple.clergy.map((person) => (
                  <div key={`${person.name}-${person.role}`} className="rounded-[20px] bg-muted p-4">
                    <p className="font-semibold">{person.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{[person.rank, person.role].filter(Boolean).join(" · ")}</p>
                    {person.details && <p className="mt-2 text-sm leading-6 text-muted-foreground">{person.details}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Информация о духовенстве пока не добавлена.</p>
            )}
          </DetailsCard>

          <DetailsCard title="Социальные сети и контакты" icon={<ExternalLink className="size-5" aria-hidden />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaLine label="Телефон" value={temple.phone} />
              <MetaLine label="Email" value={temple.email} />
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

          <ParishServicesOverview temple={temple} />

          <DetailsCard title="Служебная информация" icon={<ShieldCheck className="size-5" aria-hidden />}>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaLine label="Район" value={temple.district} />
              <MetaLine label="Тип объекта" value={temple.objectType} />
              <MetaLine label="Благочиние" value={temple.deanery} />
              <MetaLine label="Викариатство" value={temple.vicariate} />
              <MetaLine label="Дата проверки" value={formatDate(temple.lastVerifiedAt)} />
            </div>
          </DetailsCard>
        </div>

        <section className="grid gap-3">
          <h2 className="text-xl font-semibold">Карта</h2>
          <LazyTempleMap temples={[temple]} activeSlug={temple.slug} showPreview={false} />
        </section>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Отзывы</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={reviewsHref}>Все</Link>
            </Button>
          </div>
          <TempleReviews templeId={temple.id}/>
        </section>
        <SuggestCorrection templeId={temple.id}/>
      </section>
    </div>
  );
}

function DetailsCard({ title, icon, children, defaultOpen = false }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="details-panel glass rounded-glass p-5" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-lg font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </span>
        <ChevronDown className="size-5 text-muted-foreground" aria-hidden />
      </summary>
      <div className="mt-4 grid gap-4">{children}</div>
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

function MetaLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[20px] bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value ?? "не указано"}</p>
    </div>
  );
}

function LinkRow({ href, label, fullWidth = false }: { href?: string | null; label: string; fullWidth?: boolean }) {
  if (!href) {
    return null;
  }

  return (
    <Button asChild variant="outline" className={fullWidth ? "w-full" : "w-full sm:w-fit"}>
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink className="size-5" aria-hidden />
        {label}
      </a>
    </Button>
  );
}

const serviceOverviewKinds: TempleParishServiceView["kind"][] = ["sundaySchool", "youth", "social", "meetings"];

function ParishServicesOverview({ temple }: { temple: TempleView }) {
  return (
    <DetailsCard title="При храме" icon={<BookOpenText className="size-5" aria-hidden />}>
      <div className="grid gap-3 md:grid-cols-2">
        {serviceOverviewKinds.map((kind) => {
          const service = temple.parishServices.find((item) => item.kind === kind);
          const description =
            kind === "sundaySchool" ? temple.sundaySchoolDescription || service?.description : service?.description;
          const sourceUrl = kind === "sundaySchool" ? temple.sundaySchoolSourceUrl || service?.sourceUrl : service?.sourceUrl;

          return (
            <details key={kind} className="details-panel rounded-[22px] bg-muted/70 p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <h3 className="font-semibold">{getParishServiceLabel(kind)}</h3>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description || "Информация уточняется."}</p>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-primary">
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
  const description = temple.description?.trim();
  const hasActivityText = description
    ? /воскресн|молод[её]ж|социальн|приходск|миссионер|катехиз|деятельност/i.test(description)
    : false;

  if (description && !hasActivityText) {
    return description;
  }

  return temple.historySummary?.trim() || null;
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
    sameAs: temple.socialLinks.map((link) => link.url),
    aggregateRating:
      temple.approvedReviewsCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Math.max(1, temple.averageHelpfulnessRating || 1),
            reviewCount: temple.approvedReviewsCount
          }
        : undefined
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://hramgo.ru/temples/${temple.slug}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: "https://hramgo.ru" },
          { "@type": "ListItem", position: 2, name: "Храмы Москвы", item: "https://hramgo.ru/temples" },
          { "@type": "ListItem", position: 3, name: temple.shortName ?? temple.name, item: `https://hramgo.ru/temples/${temple.slug}` }
        ]
      }
    ]
  };
}
