import { Badge } from "@/components/ui/badge";

export function VerificationBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return <Badge tone="success">Данные сверены</Badge>;
  }

  return <Badge tone="warning">Требуется сверка</Badge>;
}
