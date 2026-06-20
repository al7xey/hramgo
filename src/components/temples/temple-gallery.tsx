import { TemplePhoto } from "@/components/temples/temple-photo";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TemplePhotoView } from "@/features/temples/types";

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const photo = photos[0];

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-muted">
        {photo ? (
          <TemplePhoto src={photo.imageUrl} alt={photo.alt} priority className="absolute inset-0 rounded-[22px]" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{name}</div>
        )}
      </div>
    </LiquidGlassCard>
  );
}
