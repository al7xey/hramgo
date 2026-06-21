import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenText, ChevronDown, Clock3, ExternalLink, History, Map, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/favorites/favorite-button";
import { LazyTempleMap } from "@/components/map/lazy-temple-map";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewSummary } from "@/components/reviews/review-summary";
import { BackToSearchButton } from "@/components/temples/back-to-search-button";
import { TempleGallery } from "@/components/temples/temple-gallery";
import { TransitSummary } from "@/components/temples/transit-chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import { getTempleBySlug } from "@/features/temples/repository";
import type { TempleParishServiceView, TempleView } from "@/features/temples/types";
import { formatDate } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function TemplePage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const temple = await getTempleBySlug(slug);

  if (!temple) {
    notFound();
  }

  const returnTo = getParam(query, "returnTo");
  const mapHref = returnTo?.startsWith("/map") ? returnTo : `/map?temple=${temple.slug}`;
  const reviewsHref = `/temples/${temple.slug}/reviews?returnTo=${encodeURIComponent(mapHref)}`;
  const structuredData = getTempleStructuredData(temple);
  const displayAddress = formatTempleAddress(temple.address);
  const templeDescription = getTempleDescription(temple);

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
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
          <DetailsCard title="Расписание" icon={<BookOpenText className="size-5" aria-hidden />}>
            <ScheduleSummary text={temple.scheduleSummary} />
            <LinkRow href={temple.scheduleSourceUrl ?? temple.websiteUrl} label="Проверить актуальное расписание" fullWidth />
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
          <ReviewSummary temple={temple} />
          {temple.reviews.length > 0 ? (
            <div className="grid gap-3">
              {temple.reviews.slice(0, 2).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} title="Пока нет отзывов" description="Можно первым оставить отзыв для других посетителей." />
          )}
          <ReviewForm templeId={temple.id} />
        </section>
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

function ScheduleSummary({ text }: { text?: string | null }) {
  const fallback = "Расписание лучше уточнить на официальном сайте храма перед посещением.";
  const groups = buildScheduleGroups(text ?? fallback);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className="rounded-[22px] bg-muted/70 p-4">
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <div className="mt-3 grid gap-2">
              {group.items.map((item, index) => (
                <ScheduleItem key={`${group.title}-${item}-${index}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[22px] bg-primary-soft p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Перед поездкой проверьте актуальное расписание на официальном сайте храма или по контактам прихода.
        </p>
      </div>
    </div>
  );
}

function ScheduleItem({ item }: { item: string }) {
  const match = item.match(/(\d{1,2})[.:](\d{2})/u);
  const time = match ? `${match[1]}:${match[2]}` : null;
  const label = match
    ? item
        .replace(match[0], "")
        .replace(/^[\s\u2014\u2013-]+/u, "")
        .replace(/^Еженедельно\s+по\s+[^\u2014\u2013-]+[\u2014\u2013-]\s*/iu, "")
        .trim()
    : item;

  return (
    <div className="flex gap-3 rounded-[16px] bg-background/70 p-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Clock3 className="size-4" aria-hidden />
      </span>
      <p className="min-w-0 text-sm leading-6 text-muted-foreground">
        {time && <span className="mr-2 font-semibold text-foreground">{time}</span>}
        {label}
      </p>
    </div>
  );
}

const WEEKDAY_WORDS = ["будн", "понедел", "вторник", "сред", "четвер", "пятниц"];
const WEEKEND_WORDS = ["суббот", "воскрес", "выходн", "праздник"];
const dateNoisePattern =
  /\b\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\b|\([^)]+\.с\.\)|\b\d{1,2}\s*\/\s*\d{1,2}\b/giu;
const timePattern = /([01]?\d|2[0-3])[.:](\d{2})/gu;
const eveningLiturgyGuardPattern = /\b(1[5-9]|2[0-3])[.:]00\s+[\u2014\u2013-]\s+Литургия\b/giu;

function splitSchedule(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const parts: string[] = [];

  for (const sentence of normalized.split(/(?<=\.)\s+|;\s+/)) {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) continue;
    const suffix = cleanSentence.match(/\s+[\u2014\u2013-]\s+(.+)$/u)?.[1]?.trim();
    const segments = cleanSentence.split(/\s+\/\s+/).map((item) => item.trim()).filter(Boolean);

    segments.forEach((segment, index) => {
      const needsSuffix = suffix && index < segments.length - 1 && !/[\u2014\u2013-]/u.test(segment);
      parts.push(needsSuffix ? `${segment} \u2014 ${suffix}` : segment);
    });
  }

  return parts.length > 0 ? parts : [normalized];
}

function hasAnyWord(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function scheduleBucket(item: string) {
  const lower = item.toLowerCase();
  const hasWeekday = hasAnyWord(lower, WEEKDAY_WORDS);
  const hasWeekend = hasAnyWord(lower, WEEKEND_WORDS);

  if (hasWeekday && !hasWeekend) return "weekday";
  if (hasWeekend && !hasWeekday) return "weekend";
  if (hasWeekend) return "weekend";
  if (hasWeekday) return "weekday";
  return "common";
}

function cleanScheduleItem(item: string) {
  return item
    .replace(/^(будни|выходные(?:\s+и\s+праздники)?):\s*/iu, "")
    .replace(dateNoisePattern, "")
    .replace(/\b\d{1,2}\s+[а-яё]{3,12}\.?/giu, "")
    .replace(/\([^)]*\)/g, (part) => {
      const lower = part.toLowerCase();
      return hasAnyWord(lower, [...WEEKDAY_WORDS, ...WEEKEND_WORDS]) ? "" : part;
    })
    .replace(/\b(по|в)\s+(будням|будни|выходным|выходные|субботам|воскресеньям|праздникам)\b/giu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/\s+[\u2014\u2013-]\s*$/u, "")
    .trim();
}

function scheduleServiceLabel(item: string) {
  const lower = item.toLowerCase();
  if (/ранн\w*\s+литург/iu.test(lower)) return "Ранняя Литургия";
  if (/поздн\w*\s+литург/iu.test(lower)) return "Поздняя Литургия";
  if (/литург/iu.test(lower)) return "Литургия";
  if (/всенощ|бдение/iu.test(lower)) return "Всенощное бдение";
  if (/вечерн/iu.test(lower)) return "Вечернее богослужение";
  if (/утрен/iu.test(lower)) return "Утреня";
  if (/исповед/iu.test(lower)) return "Исповедь";
  if (/молеб/iu.test(lower)) return "Молебен";
  if (/панихид/iu.test(lower)) return "Панихида";
  if (/акафист/iu.test(lower)) return "Акафист";
  if (/богослуж|служб/iu.test(lower)) return "Богослужение";
  return null;
}

function normalizeScheduleItems(item: string) {
  const clean = cleanScheduleItem(item);
  const matches = Array.from(clean.matchAll(timePattern));
  if (matches.length === 0) return [];

  const labelFromText = scheduleServiceLabel(clean);
  return matches.map((match) => {
    const time = `${match[1].padStart(2, "0")}:${match[2]}`;
    const hour = Number(match[1]);
    const afterTime = clean
      .replace(match[0], "")
      .replace(timePattern, "")
      .replace(/^[\s\u2014\u2013,/-]+/u, "")
      .trim();
    const safeLabelFromText = labelFromText === "Литургия" && hour >= 15 ? "Вечернее богослужение" : labelFromText;
    const label = safeLabelFromText ?? (afterTime.length <= 70 ? afterTime : "Богослужение");
    return `${time} — ${label || "Богослужение"}`;
  });
}

function uniqueScheduleItems(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    for (const normalized of normalizeScheduleItems(item)) {
      const time = normalized.match(timePattern)?.[0] ?? normalized;
      const key = time.toLowerCase();
      const safeNormalized = normalized.replace(eveningLiturgyGuardPattern, "$1:00 — Вечернее богослужение");
      if (!safeNormalized || seen.has(key)) continue;
      seen.add(key);
      result.push(safeNormalized);
    }
  }

  return result.slice(0, 5);
}

function buildScheduleGroups(text: string) {
  const structured = buildStructuredScheduleGroups(text);
  if (structured) {
    return structured;
  }

  const items = splitSchedule(text);
  const weekday: string[] = [];
  const weekend: string[] = [];
  const common: string[] = [];

  for (const item of items) {
    const bucket = scheduleBucket(item);
    if (bucket === "weekday") weekday.push(item);
    else if (bucket === "weekend") weekend.push(item);
    else common.push(item);
  }

  const fallback = ["Информация уточняется"];
  const weekdayItems = uniqueScheduleItems(weekday.length > 0 ? weekday : common);
  const weekendItems = uniqueScheduleItems(weekend.length > 0 ? weekend : []);

  return [
    { title: "Будни", items: weekdayItems.length > 0 ? weekdayItems : fallback },
    { title: "Выходные", items: weekendItems.length > 0 ? weekendItems : fallback }
  ];
}

function splitScheduleSectionItems(text: string) {
  return text
    .split(/\n|;\s*|•\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStructuredScheduleGroups(text: string) {
  const sections = new globalThis.Map<"weekday" | "weekend", string[]>();
  const sectionPattern = /(Будни|Выходные(?:\s+и\s+праздники)?)\s*:\s*([\s\S]*?)(?=(?:Будни|Выходные(?:\s+и\s+праздники)?|Примечание)\s*:|$)/giu;

  for (const match of text.matchAll(sectionPattern)) {
    const title = match[1].toLowerCase();
    const bucket = title.includes("выход") ? "weekend" : "weekday";
    sections.set(bucket, [...(sections.get(bucket) ?? []), ...splitScheduleSectionItems(match[2])]);
  }

  if (sections.size === 0) {
    return null;
  }

  const fallback = ["Информация уточняется"];
  const weekdayItems = uniqueScheduleItems(sections.get("weekday") ?? []);
  const weekendItems = uniqueScheduleItems(sections.get("weekend") ?? []);

  return [
    { title: "Будни", items: weekdayItems.length > 0 ? weekdayItems : fallback },
    { title: "Выходные", items: weekendItems.length > 0 ? weekendItems : fallback }
  ];
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
