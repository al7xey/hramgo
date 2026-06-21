"use client";

import { Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleView } from "@/features/temples/types";

type PhotoItem = {
  id: string;
  imageUrl: string;
  alt: string;
  sourceUrl?: string | null;
  isMain: boolean;
  templeId: string;
  templeName: string;
};

const inputClass =
  "h-11 rounded-[20px] border border-card-border bg-white/75 px-4 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary-soft dark:bg-white/10 dark:text-white";

export function AdminPhotoModerationGrid({ temples }: { temples: TempleView[] }) {
  const initialPhotos = useMemo(
    () =>
      temples.flatMap((temple) =>
        temple.photos.map((photo) => ({
          ...photo,
          templeId: temple.id,
          templeName: temple.shortName ?? temple.name
        }))
      ),
    [temples]
  );
  const [photos, setPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [templeId, setTempleId] = useState(temples[0]?.id ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [pending, setPending] = useState(false);

  async function addPhoto() {
    setPending(true);
    const response = await fetch("/api/admin/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templeId, imageUrl, sourceUrl, alt, isMain })
    });
    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      window.alert(data?.message ?? "Не удалось добавить фото.");
      return;
    }

    const data = await response.json();
    const temple = temples.find((item) => item.id === templeId);
    const nextPhoto: PhotoItem = { ...data.photo, templeId, templeName: temple?.shortName ?? temple?.name ?? "Храм" };
    setPhotos((items) => {
      const cleared = nextPhoto.isMain ? items.map((item) => (item.templeId === templeId ? { ...item, isMain: false } : item)) : items;
      return [nextPhoto, ...cleared];
    });
    setImageUrl("");
    setSourceUrl("");
    setAlt("");
    setIsMain(false);
  }

  async function setMain(photo: PhotoItem) {
    const response = await fetch(`/api/admin/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isMain: true })
    });

    if (!response.ok) {
      window.alert("Не удалось сделать фото обложкой.");
      return;
    }

    setPhotos((items) => items.map((item) => (item.templeId === photo.templeId ? { ...item, isMain: item.id === photo.id } : item)));
  }

  async function deletePhoto(photo: PhotoItem) {
    if (!window.confirm("Удалить фото?")) return;
    const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });

    if (!response.ok) {
      window.alert("Не удалось удалить фото.");
      return;
    }

    setPhotos((items) => items.filter((item) => item.id !== photo.id));
  }

  return (
    <div className="grid gap-5">
      <LiquidGlassCard className="grid gap-3 p-4">
        <h2 className="text-xl font-semibold">Добавить фото вручную</h2>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1.8fr_1.4fr]">
          <select value={templeId} onChange={(event) => setTempleId(event.target.value)} className={inputClass}>
            {temples.map((temple) => (
              <option key={temple.id} value={temple.id}>
                {temple.shortName ?? temple.name}
              </option>
            ))}
          </select>
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Прямая ссылка на фото" className={inputClass} />
          <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Источник, например Яндекс Карты" className={inputClass} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Alt / подпись" className={inputClass} />
          <label className="flex items-center gap-2 rounded-[20px] border border-card-border px-4 py-2 text-sm">
            <input type="checkbox" checked={isMain} onChange={(event) => setIsMain(event.target.checked)} />
            Сделать обложкой
          </label>
          <Button type="button" onClick={() => void addPhoto()} disabled={pending || !templeId || !imageUrl}>
            Добавить фото
          </Button>
        </div>
      </LiquidGlassCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((photo) => (
          <LiquidGlassCard key={photo.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              <img src={photo.imageUrl} alt={photo.alt} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="grid gap-3 p-4">
              <div>
                <p className="font-medium">{photo.templeName}</p>
                {photo.sourceUrl ? (
                  <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-primary">
                    Источник
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {photo.isMain ? <Badge tone="success">Обложка</Badge> : <Badge tone="warning">Фото</Badge>}
                <Button type="button" variant="outline" size="sm" onClick={() => void setMain(photo)} disabled={photo.isMain}>
                  <Star className="size-4" aria-hidden />
                  Обложка
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void deletePhoto(photo)}>
                  <Trash2 className="size-4" aria-hidden />
                  Удалить
                </Button>
              </div>
            </div>
          </LiquidGlassCard>
        ))}
      </div>
    </div>
  );
}
