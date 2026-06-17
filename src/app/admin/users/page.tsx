import { Users } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export default function AdminUsersPage() {
  return (
    <EmptyState
      icon={Users}
      title="Пользователи появятся после входа"
      description="Роли USER, MODERATOR, ADMIN и TEMPLE_REPRESENTATIVE определены в Prisma schema."
    />
  );
}
