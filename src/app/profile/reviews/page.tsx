"use client";

import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { RatingStars } from "@/components/reviews/rating-stars";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";

type MyReview = {
  id: string;
  rating: number;
  text: string;
  status: string;
  helpfulCount: number;
  publishedAt: string;
  temple: {
    name: string;
    slug: string;
  };
};

export default function ProfileReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/me/reviews")
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (active) setReviews(data.reviews ?? []);
      })
      .catch(() => {
        if (active) setMessage("Не удалось загрузить отзывы.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function deleteReview(reviewId: string) {
    if (!window.confirm("Удалить отзыв? Он исчезнет с сайта и перестанет влиять на рейтинг храма.")) return;

    setDeletingId(reviewId);
    setMessage(null);

    const response = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
    setDeletingId(null);

    if (!response.ok) {
      setMessage("Не удалось удалить отзыв.");
      return;
    }

    setReviews((items) => items.filter((review) => review.id !== reviewId));
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <LiquidGlassCard className="p-5 text-sm text-muted-foreground">Загружаем отзывы...</LiquidGlassCard>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={MessageCircle}
          title="Пока нет отзывов"
          description="Ваши опубликованные отзывы появятся здесь. Старые отзывы тоже можно будет удалить."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Мои отзывы</h1>
        <p className="mt-2 text-sm text-muted-foreground">Здесь можно удалить любой свой отзыв, включая старые.</p>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {reviews.map((review) => (
        <LiquidGlassCard key={review.id} className="grid gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/temples/${review.temple.slug}`} className="line-clamp-2 font-semibold hover:text-primary">
                {review.temple.name}
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(review.publishedAt).toLocaleDateString("ru-RU")}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void deleteReview(review.id)}
              disabled={deletingId === review.id}
              aria-label="Удалить отзыв"
              title="Удалить отзыв"
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          </div>
          <RatingStars value={review.rating} />
          <p className="text-sm leading-6 text-muted-foreground">{review.text}</p>
        </LiquidGlassCard>
      ))}
    </div>
  );
}
