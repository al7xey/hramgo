import { ClipboardEdit } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function RepresentativeSuggestionsPage() {
  return (
    <EmptyState
      icon={ClipboardEdit}
      title="Предложите правку данных"
      description="Правки расписания, телефона, сайта, описания и воскресной школы попадут в очередь администратора."
    />
  );
}
