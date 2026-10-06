"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

import { TempleMapBottomSheet } from "@/components/map/temple-map-bottom-sheet";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleMapView } from "@/features/temples/types";
import { readMapView, saveMapView } from "@/features/temples/view-state";

type YMap = {
  destroy: () => void;
  geoObjects: { add: (object: YObjectManager) => void };
  events: { add: (eventName: string, handler: () => void) => void };
  setBounds: (bounds: unknown, options: Record<string, unknown>) => void;
  panTo: (coords: [number, number], options: Record<string, unknown>) => void;
  getCenter: () => [number, number];
  getZoom: () => number;
  behaviors: {
    disable: (name: string) => void;
    enable: (name: string) => void;
  };
};

type YMapEvent = {
  get: (key: string) => unknown;
};

type YObjectManager = {
  add: (objects: unknown) => void;
  removeAll: () => void;
  getBounds: () => unknown;
  objects: {
    setObjectOptions: (id: string, options: Record<string, unknown>) => void;
    events: {
      add: (eventName: string, handler: (event: YMapEvent) => void) => void;
    };
  };
};

type YMapsApi = {
  ready: (handler: () => void) => void;
  Map: new (
    node: HTMLElement,
    state: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => YMap;
  ObjectManager: new (options: Record<string, unknown>) => YObjectManager;
};

declare global {
  interface Window {
    ymaps?: YMapsApi;
    __hramgoYmapsPromise?: Promise<YMapsApi>;
  }
}

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

export type TempleMapProps = {
  temples: TempleMapView[];
  activeSlug?: string;
  sidebarTop?: ReactNode;
  showPreview?: boolean;
  onSelect?: (slug: string | undefined) => void;
  viewKey?: string;
};

export const TempleMap = memo(function TempleMap({
  temples,
  activeSlug,
  sidebarTop,
  showPreview = true,
  onSelect,
  viewKey
}: TempleMapProps) {
  const points = useMemo(
    () => temples.filter((temple) => temple.latitude && temple.longitude),
    [temples]
  );
  const pointsKey = useMemo(
    () =>
      points
        .map((temple) => `${temple.id}:${temple.latitude}:${temple.longitude}`)
        .join("|"),
    [points]
  );
  const slugById = useMemo(
    () => new Map(points.map((temple) => [temple.id, temple.slug])),
    [points]
  );
  const [selectedSlug, setSelectedSlug] = useState(activeSlug);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<{
    coords: [number, number];
    accuracy: number;
  }>();
  const [locationError, setLocationError] = useState("");
  const locationWatch = useRef<number | null>(null);
  const locationActive = useRef(false);
  const locationManager = useRef<YObjectManager | null>(null);
  function stopLocation() {
    if (locationWatch.current !== null)
      navigator.geolocation.clearWatch(locationWatch.current);
    locationWatch.current = null;
    locationActive.current = false;
    locationManager.current?.removeAll();
    setPosition(undefined);
    setLocating(false);
  }
  function toggleLocation() {
    setLocationError("");
    if (locationActive.current) {
      stopLocation();
      return;
    }
    if (!navigator.geolocation) {
      setLocationError(
        "Геопозиция недоступна. Найдите храм по адресу или метро."
      );
      return;
    }
    locationActive.current = true;
    setLocating(true);
    let first = true;
    locationWatch.current = navigator.geolocation.watchPosition(
      (result) => {
        if (!locationActive.current) return;
        const coords: [number, number] = [
          result.coords.latitude,
          result.coords.longitude
        ];
        setPosition({ coords, accuracy: result.coords.accuracy });
        setLocating(false);
        setLocationError("");
        if (first)
          mapRef.current?.panTo(coords, { flying: false, duration: 0 });
        first = false;
      },
      (error) => {
        if (!locationActive.current) return;
        stopLocation();
        setLocationError(
          error.code === 1
            ? "Доступ к геопозиции запрещён. Разрешите его в настройках браузера или ищите по адресу и метро."
            : "Не удалось определить геопозицию. Попробуйте ещё раз или ищите по адресу и метро."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }
  useEffect(
    () => () => {
      locationActive.current = false;
      if (locationWatch.current !== null)
        navigator.geolocation.clearWatch(locationWatch.current);
    },
    []
  );
  const selectionRef = useRef(onSelect);
  const viewKeyRef = useRef(viewKey);
  const restoredViewport = useRef(false);
  const highlightedId = useRef<string | undefined>(undefined);
  useEffect(() => {
    selectionRef.current = onSelect;
    viewKeyRef.current = viewKey;
  }, [onSelect, viewKey]);
  function select(slug: string | undefined) {
    setSelectedSlug(slug);
    selectionRef.current?.(slug);
  }
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMap | null>(null);
  const objectManagerRef = useRef<YObjectManager | null>(null);
  const fittedPointsKeyRef = useRef<string | null>(null);
  const suppressMapClickUntilRef = useRef(0);
  const slugByIdRef = useRef(slugById);
  const activeTemple = useMemo(
    () => points.find((temple) => temple.slug === selectedSlug),
    [points, selectedSlug]
  );

  useEffect(() => {
    slugByIdRef.current = slugById;
  }, [slugById]);

  useEffect(() => {
    setSelectedSlug(activeSlug);
  }, [activeSlug]);

  useEffect(() => {
    let cancelled = false;
    setMapError(false);
    setMapReady(false);

    loadYmaps()
      .then((ymaps) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) {
          return;
        }

        const restoredView = viewKeyRef.current
          ? readMapView(viewKeyRef.current)
          : undefined;
        restoredViewport.current = Boolean(restoredView);
        const center: [number, number] =
          restoredView?.center ??
          (activeTemple?.latitude && activeTemple.longitude
            ? [activeTemple.latitude, activeTemple.longitude]
            : MOSCOW_CENTER);
        mapRef.current = new ymaps.Map(
          mapNodeRef.current,
          {
            center,
            zoom: restoredView?.zoom ?? (points.length > 1 ? 10 : 15),
            controls: ["zoomControl", "fullscreenControl"]
          },
          { suppressMapOpenBlock: true }
        );
        mapRef.current.behaviors.disable("scrollZoom");
        if (window.matchMedia("(max-width: 767px)").matches)
          mapRef.current.behaviors.disable("drag");
        mapRef.current.events.add("boundschange", () => {
          const map = mapRef.current,
            key = viewKeyRef.current;
          if (map && key && !locationActive.current)
            saveMapView(key, map.getCenter(), map.getZoom());
        });
        objectManagerRef.current = new ymaps.ObjectManager({
          clusterize: true,
          gridSize: 48,
          clusterDisableClickZoom: false,
          geoObjectOpenBalloonOnClick: false,
          clusterOpenBalloonOnClick: false,
          clusterPreset: "islands#darkBlueClusterIcons"
        });
        objectManagerRef.current.objects.events.add("click", (event) => {
          const objectId = String(event.get("objectId") ?? "");
          const slug = slugByIdRef.current.get(objectId);

          if (slug) {
            suppressMapClickUntilRef.current = Date.now() + 250;
            select(slug);
          }
        });
        mapRef.current.geoObjects.add(objectManagerRef.current);
        locationManager.current = new ymaps.ObjectManager({
          clusterize: false
        });
        mapRef.current.geoObjects.add(locationManager.current);
        mapRef.current.events.add("click", () => {
          if (Date.now() < suppressMapClickUntilRef.current) {
            return;
          }

          select(undefined);
        });
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMapReady(false);
          setMapError(true);
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      objectManagerRef.current = null;
      locationManager.current = null;
      fittedPointsKeyRef.current = null;
    };
    // The SDK instance persists while selection/points change; effects below update it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (!mapReady || !locationManager.current) return;
    locationManager.current.removeAll();
    if (position)
      locationManager.current.add({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "user-position",
            geometry: { type: "Point", coordinates: position.coords },
            properties: {
              iconCaption: "Вы здесь",
              hintContent: `Ваша геопозиция · точность около ${Math.ceil(position.accuracy)} м`
            },
            options: {
              preset: "islands#circleDotIcon",
              iconColor: "#244b78",
              zIndex: 3000,
              openBalloonOnClick: false
            }
          }
        ]
      });
  }, [mapReady, position]);

  useEffect(() => {
    if (!mapReady || !objectManagerRef.current) {
      return;
    }

    objectManagerRef.current.removeAll();
    objectManagerRef.current.add({
      type: "FeatureCollection",
      features: points.map((temple) => ({
        type: "Feature",
        id: temple.id,
        geometry: {
          type: "Point",
          coordinates: [temple.latitude, temple.longitude]
        },
        properties: {
          hintContent: temple.name.replace(
            /[&<>"']/g,
            (char) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
              })[char]!
          ),
          balloonContent: ""
        },
        options: {
          preset: "islands#icon",
          iconColor: "#244b78"
        }
      }))
    });

    if (restoredViewport.current) {
      fittedPointsKeyRef.current = pointsKey;
      restoredViewport.current = false;
    }
    if (points.length > 1 && fittedPointsKeyRef.current !== pointsKey) {
      const bounds = objectManagerRef.current.getBounds();
      if (bounds && mapRef.current) {
        mapRef.current.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 42
        });
        fittedPointsKeyRef.current = pointsKey;
      }
    }
  }, [mapReady, points, pointsKey]);

  useEffect(() => {
    if (
      !mapReady ||
      !activeTemple?.latitude ||
      !activeTemple.longitude ||
      !mapRef.current
    ) {
      return;
    }

    mapRef.current.panTo([activeTemple.latitude, activeTemple.longitude], {
      flying: false,
      duration: 0
    });
  }, [activeTemple?.latitude, activeTemple?.longitude, mapReady]);
  useEffect(() => {
    const manager = objectManagerRef.current;
    if (!mapReady || !manager) return;
    if (
      highlightedId.current &&
      points.some((t) => t.id === highlightedId.current)
    )
      manager.objects.setObjectOptions(highlightedId.current, {
        preset: "islands#icon",
        iconColor: "#244b78",
        zIndex: 1
      });
    if (activeTemple)
      manager.objects.setObjectOptions(activeTemple.id, {
        preset: "islands#dotIcon",
        iconColor: "#244b78",
        zIndex: 2000
      });
    highlightedId.current = activeTemple?.id;
  }, [mapReady, activeTemple, pointsKey, points]);

  return (
    <div
      className={`grid gap-4 ${sidebarTop ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""} xl:items-start`}
    >
      {sidebarTop ? <div className="xl:hidden">{sidebarTop}</div> : null}

      <LiquidGlassCard className="relative overflow-hidden p-2">
        <div className="flex min-h-[104px] flex-wrap items-center gap-2 px-2 pb-2 md:min-h-[52px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!mapReady}
            aria-pressed={Boolean(position) || locating}
            onClick={toggleLocation}
          >
            <LocateFixed className="size-4" aria-hidden />
            {locating
              ? "Отменить определение"
              : position
                ? "Выключить геопозицию"
                : "Включить геопозицию"}
          </Button>
          {mapReady && (
            <button
              type="button"
              className="min-h-11 rounded-[18px] border border-card-border bg-background px-3 text-sm text-primary md:hidden"
              aria-pressed={dragEnabled}
              onClick={() => {
                if (dragEnabled) mapRef.current?.behaviors.disable("drag");
                else mapRef.current?.behaviors.enable("drag");
                setDragEnabled(!dragEnabled);
              }}
            >
              {dragEnabled ? "Прокрутка страницы" : "Управлять картой"}
            </button>
          )}

          <p className="text-xs text-muted-foreground" role="status">
            {locationError ||
              (locating
                ? "Определяем местоположение…"
                : position
                  ? `Вы на карте · точность ≈ ${Math.ceil(position.accuracy)} м`
                  : "")}
          </p>
        </div>
        <div
          ref={mapNodeRef}
          role="region"
          aria-label="Карта храмов Москвы"
          className="h-[420px] w-full overflow-hidden rounded-[24px] bg-muted md:h-[520px] xl:h-[640px]"
        />
        {!mapReady && (
          <div
            className="absolute inset-2 grid place-content-center gap-3 rounded-[24px] bg-background/95 p-5 text-center"
            role={mapError ? "alert" : "status"}
          >
            <p>
              {mapError
                ? "Карта не загрузилась. Храмы можно выбрать в списке."
                : "Загрузка карты…"}
            </p>
            {mapError && (
              <>
                <button
                  className="min-h-11 rounded-[18px] bg-action px-4 text-white"
                  onClick={() => setAttempt((v) => v + 1)}
                >
                  Повторить
                </button>
                <a
                  className="underline"
                  href={`/temples/${typeof window !== "undefined" ? window.location.search : ""}`}
                >
                  Смотреть списком
                </a>
              </>
            )}
          </div>
        )}
        {showPreview && activeTemple ? (
          <div className="mt-3 xl:absolute xl:inset-x-3 xl:bottom-3 xl:z-10 xl:mt-0 xl:max-w-[340px]">
            <TempleMapBottomSheet
              temple={activeTemple}
              onClose={() => select(undefined)}
            />
          </div>
        ) : null}
      </LiquidGlassCard>

      {sidebarTop && (
        <div className="hidden gap-4 self-start xl:sticky xl:top-24 xl:grid">
          {sidebarTop}
        </div>
      )}
    </div>
  );
});

function loadYmaps() {
  if (window.ymaps) {
    return new Promise<YMapsApi>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("MAP_TIMEOUT")), 12000);
      window.ymaps?.ready(() => {
        clearTimeout(timeout);
        resolve(window.ymaps!);
      });
    });
  }

  if (!window.__hramgoYmapsPromise) {
    window.__hramgoYmapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
      script.async = true;
      const timeout = setTimeout(() => {
        window.__hramgoYmapsPromise = undefined;
        script.remove();
        reject(new Error("MAP_TIMEOUT"));
      }, 12000);
      script.onload = () => {
        if (!window.ymaps) {
          clearTimeout(timeout);
          window.__hramgoYmapsPromise = undefined;
          script.remove();
          reject(new Error("Yandex Maps API is unavailable"));
          return;
        }

        window.ymaps.ready(() => {
          clearTimeout(timeout);
          resolve(window.ymaps!);
        });
      };
      script.onerror = () => {
        clearTimeout(timeout);
        window.__hramgoYmapsPromise = undefined;
        script.remove();
        reject(new Error("MAP_LOAD_FAILED"));
      };
      document.head.appendChild(script);
    });
  }

  return window.__hramgoYmapsPromise;
}
