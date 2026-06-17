import Link from "next/link";
import { ArrowLeft, Map, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTempleBySlug } from "@/features/temples/repository";

type SearchParams = Record<string, string | string[] | undefined>;

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function TempleReviewsPage({
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
  const templeHref = `/temples/${temple.slug}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  const mapHref = returnTo?.startsWith("/map") ? returnTo : `/map?temple=${temple.slug}`;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={templeHref}>
              <ArrowLeft className="size-4" aria-hidden />
              К храму
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={mapHref}>
              <Map className="size-4" aria-hidden />
              К карте
            </Link>
          </Button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{temple.shortName ?? temple.name}</p>
          <h1 className="mt-1 text-3xl font-semibold">Отзывы посетителей</h1>
        </div>
      </div>
      {temple.reviews.length > 0 ? (
        <div className="grid gap-3">
          {temple.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title="Пока нет отзывов"
          description="Вы можете первым оставить отзыв для других посетителей."
        />
      )}
      <ReviewForm templeId={temple.id} />
    </div>
  );
}
