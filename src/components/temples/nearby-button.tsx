"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
export function NearbyButton() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setError("");
          if (!navigator.geolocation) {
            setError(
              "Местоположение недоступно. Введите станцию метро или улицу в поиске."
            );
            return;
          }
          setBusy(true);
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setBusy(false);
              const { latitude, longitude } = p.coords;
              if (
                latitude < 55 ||
                latitude > 56.2 ||
                longitude < 36.5 ||
                longitude > 38
              ) {
                setError(
                  "Сейчас в каталоге храмы Москвы. Выберите московскую станцию или улицу."
                );
                return;
              }
              const params = new URLSearchParams(window.location.search);
              params.set("latitude", String(latitude));
              params.set("longitude", String(longitude));
              params.set("radiusKm", "5");
              params.set("sort", "distance");
              router.push(`/temples/?${params}`);
            },
            (e) => {
              setBusy(false);
              setError(
                e.code === 1
                  ? "Вы запретили доступ к местоположению. Найдите храм по станции или улице."
                  : "Не удалось определить место. Попробуйте снова или введите станцию метро."
              );
            },
            { timeout: 10000, maximumAge: 60000 }
          );
        }}
      >
        <LocateFixed className="size-4" aria-hidden />
        {busy ? "Определяем место…" : "Рядом со мной"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-muted-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
