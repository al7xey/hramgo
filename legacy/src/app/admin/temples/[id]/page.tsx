import { notFound } from "next/navigation";

import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { listTemples } from "@/features/temples/repository";

export default async function AdminTemplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temples = await listTemples({});
  const temple = temples.find((item) => item.id === id);

  if (!temple) {
    notFound();
  }

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-semibold">{temple.shortName ?? temple.name}</h1>
      <LiquidGlassCard className="grid gap-3 p-5 text-sm">
        <p>
          <span className="text-muted-foreground">Адрес:</span> {temple.address}
        </p>
        <p>
          <span className="text-muted-foreground">Сайт:</span> {temple.websiteUrl ?? "не указан"}
        </p>
        <p>
          <span className="text-muted-foreground">Дата проверки:</span> {temple.lastVerifiedAt ?? "не указана"}
        </p>
      </LiquidGlassCard>
    </div>
  );
}
