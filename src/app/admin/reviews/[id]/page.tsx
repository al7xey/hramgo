import { notFound } from "next/navigation";

import { ReviewCard } from "@/components/reviews/review-card";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { listTemples } from "@/features/temples/repository";

export default async function AdminReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temples = await listTemples({});
  const review = temples.flatMap((temple) => temple.reviews).find((item) => item.id === id);

  if (!review) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">Проверка отзыва</h1>
      <ReviewCard review={review} />
      <LiquidGlassCard className="grid gap-2 p-4 sm:grid-cols-3">
        <Button variant="secondary">Одобрить</Button>
        <Button variant="outline">Отправить на уточнение</Button>
        <Button variant="danger">Отклонить</Button>
      </LiquidGlassCard>
    </div>
  );
}
