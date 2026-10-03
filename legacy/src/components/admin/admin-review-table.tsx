"use client";

import Link from "next/link";
import { useState } from "react";

import { AdminDeleteReviewButton } from "@/components/admin/admin-delete-review-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function AdminReviewTable({ temples }: { temples: TempleView[] }) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const reviews = temples
    .flatMap((temple) => temple.reviews.map((review) => ({ temple, review })))
    .filter(({ review }) => !hiddenIds.has(review.id));

  return (
    <LiquidGlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-card-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Храм</th>
              <th className="px-4 py-3 font-medium">Автор</th>
              <th className="px-4 py-3 font-medium">Фрагмент</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(({ temple, review }) => (
              <tr key={review.id} className="border-b border-card-border/60 last:border-b-0">
                <td className="px-4 py-3 font-medium">{temple.shortName ?? temple.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{review.authorName}</td>
                <td className="max-w-xs px-4 py-3 text-muted-foreground">
                  <span className="line-clamp-1">{review.text}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone="success">Опубликовано</Badge>
                </td>
                <td className="flex gap-2 px-4 py-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/reviews/${review.id}`}>Открыть</Link>
                  </Button>
                  <AdminDeleteReviewButton reviewId={review.id} onDeleted={() => setHiddenIds((ids) => new Set(ids).add(review.id))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LiquidGlassCard>
  );
}
