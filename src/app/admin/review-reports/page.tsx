import { Flag } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function AdminReviewReportsPage() {
  return (
    <EmptyState
      icon={Flag}
      title="Открытых сообщений нет"
      description="Новые сообщения об отзывах будут появляться в этой очереди."
    />
  );
}
