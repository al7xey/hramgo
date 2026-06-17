import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function AdminRepresentativesPage() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Заявок представителей нет"
      description="Заявки представителей храмов будут проходить ручное подтверждение администратора."
    />
  );
}
