import Link from "next/link";

import { VerificationBadge } from "@/components/temples/verification-badge";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function AdminTempleTable({ temples }: { temples: TempleView[] }) {
  return (
    <LiquidGlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-card-border text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Храм</th>
              <th className="px-4 py-3 font-medium">Район</th>
              <th className="px-4 py-3 font-medium">Проверка</th>
              <th className="px-4 py-3 font-medium">Отзывы</th>
              <th className="px-4 py-3 font-medium">Действие</th>
            </tr>
          </thead>
          <tbody>
            {temples.map((temple) => (
              <tr key={temple.id} className="border-b border-card-border/60 last:border-b-0">
                <td className="px-4 py-3 font-medium">{temple.shortName ?? temple.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{temple.district}</td>
                <td className="px-4 py-3">
                  <VerificationBadge confidence={temple.dataConfidence} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{temple.approvedReviewsCount}</td>
                <td className="px-4 py-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/temples/${temple.id}`}>Открыть</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LiquidGlassCard>
  );
}
