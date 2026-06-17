import { Badge } from "@/components/ui/badge";
import type { SundaySchoolStatus } from "@/features/temples/types";

export function SundaySchoolBadge({ status }: { status: SundaySchoolStatus }) {
  if (status === "YES") {
    return <Badge tone="default">Воскресная школа</Badge>;
  }

  if (status === "NO") {
    return <Badge tone="muted">Занятий нет</Badge>;
  }

  return <Badge tone="muted">Школа уточняется</Badge>;
}
