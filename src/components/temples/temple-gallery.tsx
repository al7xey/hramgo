import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { TemplePhoto } from "@/components/temples/temple-photo";
import type { TemplePhotoView } from "@/features/temples/types";

export function TempleGallery({ photos, name }: { photos: TemplePhotoView[]; name: string }) {
  const mainPhoto = photos[0];

  return (
    <LiquidGlassCard className="h-fit overflow-hidden p-2 lg:self-start">
      <div className="relative aspect-[4/3] w-full bg-muted md:aspect-[16/9]">
        {mainPhoto ? (
          <TemplePhoto src={mainPhoto.imageUrl} alt={mainPhoto.alt} priority className="absolute inset-0 rounded-[22px]" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{name}</div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
          {photos.slice(1, 8).map((photo) => (
            <TemplePhoto key={photo.id} src={photo.imageUrl} alt={photo.alt} className="aspect-[4/3] w-28 shrink-0 snap-start rounded-[18px]" />
          ))}
        </div>
      )}
    </LiquidGlassCard>
  );
}
