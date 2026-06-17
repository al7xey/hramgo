import { Camera } from "lucide-react";

export function ReviewPhotoUploader() {
  return (
    <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-card-border bg-muted px-4 text-center text-sm text-muted-foreground">
      <Camera className="size-5 text-primary" aria-hidden />
      <span>Добавить фото</span>
      <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" />
    </label>
  );
}
