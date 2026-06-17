import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function ProfileReviewsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={MessageCircle}
        title="Ваши отзывы появятся здесь"
        description="После отправки отзыв сразу появится на странице храма."
      />
    </div>
  );
}
