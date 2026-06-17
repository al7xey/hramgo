import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

export function AdminPhotoModerationGrid({ temples }: { temples: TempleView[] }) {
  const photos = temples.flatMap((temple) => temple.photos.map((photo) => ({ temple, photo })));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {photos.map(({ temple, photo }) => (
        <LiquidGlassCard key={photo.id} className="overflow-hidden">
          <div className="relative aspect-[4/3]">
            <Image src={photo.imageUrl} alt={photo.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
          <div className="p-4">
            <p className="font-medium">{temple.shortName ?? temple.name}</p>
            <div className="mt-2">
              <Badge tone="warning">Нужна проверка прав</Badge>
            </div>
          </div>
        </LiquidGlassCard>
      ))}
    </div>
  );
}
