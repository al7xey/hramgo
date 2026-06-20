"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { TempleMapBottomSheet } from "@/components/map/temple-map-bottom-sheet";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleMapView } from "@/features/temples/types";

type YMap = {
  geoObjects: { add: (object: YObjectManager) => void };
  setBounds: (bounds: unknown, options: Record<string, unknown>) => void;
  panTo: (coords: [number, number], options: Record<string, unknown>) => void;
};

type YMapEvent = {
  get: (key: string) => unknown;
};

type YObjectManager = {
  add: (objects: unknown) => void;
  removeAll: () => void;
  getBounds: () => unknown;
  objects: {
    events: { add: (eventName: string, handler: (event: YMapEvent) => void) => void };
  };
};

type YMapsApi = {
  ready: (handler: () => void) => void;
  Map: new (node: HTMLElement, state: Record<string, unknown>, options?: Record<string, unknown>) => YMap;
  ObjectManager: new (options: Record<string, unknown>) => YObjectManager;
};

declare global {
  interface Window {
    ymaps?: YMapsApi;
    __hramgoYmapsPromise?: Promise<YMapsApi>;
  }
}

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

export const TempleMap = memo(function TempleMap({ temples, activeSlug, sidebarTop }: { temples: TempleMapView[]; activeSlug?: string; sidebarTop?: ReactNode }) {
  const points = useMemo(() => temples.filter((temple) => temple.latitude && temple.longitude), [temples]);
  const pointsKey = useMemo(() => points.map((temple) => `${temple.id}:${temple.latitude}:${temple.longitude}`).join("|"), [points]);
  const slugById = useMemo(() => new Map(points.map((temple) => [temple.id, temple.slug])), [points]);
  const [selectedSlug, setSelectedSlug] = useState(activeSlug);
  const [mapReady, setMapReady] = useState(false);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMap | null>(null);
  const objectManagerRef = useRef<YObjectManager | null>(null);
  const fittedPointsKeyRef = useRef<string | null>(null);
  const slugByIdRef = useRef(slugById);
  const activeTemple = useMemo(() => points.find((temple) => temple.slug === selectedSlug), [points, selectedSlug]);

  useEffect(() => {
    slugByIdRef.current = slugById;
  }, [slugById]);

  useEffect(() => {
    setSelectedSlug(activeSlug);
  }, [activeSlug]);

  useEffect(() => {
    let cancelled = false;

    loadYmaps()
      .then((ymaps) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) {
          return;
        }

        const center: [number, number] =
          activeTemple?.latitude && activeTemple.longitude ? [activeTemple.latitude, activeTemple.longitude] : MOSCOW_CENTER;
        mapRef.current = new ymaps.Map(
          mapNodeRef.current,
          {
            center,
            zoom: points.length > 1 ? 10 : 15,
            controls: ["zoomControl", "geolocationControl", "fullscreenControl"]
          },
          { suppressMapOpenBlock: true }
        );
        objectManagerRef.current = new ymaps.ObjectManager({
          clusterize: true,
          gridSize: 48,
          clusterDisableClickZoom: false,
          geoObjectOpenBalloonOnClick: false,
          clusterOpenBalloonOnClick: false
        });
        objectManagerRef.current.objects.events.add("click", (event) => {
          const objectId = String(event.get("objectId") ?? "");
          const slug = slugByIdRef.current.get(objectId);

          if (slug) {
            setSelectedSlug(slug);
          }
        });
        mapRef.current.geoObjects.add(objectManagerRef.current);
        setMapReady(true);
      })
      .catch(() => setMapReady(false));

    return () => {
      cancelled = true;
    };
  }, [activeTemple?.latitude, activeTemple?.longitude, points.length]);

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
          hintContent: temple.shortName ?? temple.name,
          balloonContent: ""
        },
        options: {
          preset: "islands#blueIcon",
          iconColor: "#4b9fe1"
        }
      }))
    });

    if (points.length > 1 && fittedPointsKeyRef.current !== pointsKey) {
      const bounds = objectManagerRef.current.getBounds();
      if (bounds && mapRef.current) {
        mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 42 });
        fittedPointsKeyRef.current = pointsKey;
      }
    }
  }, [mapReady, points, pointsKey]);

  useEffect(() => {
    if (!mapReady || !activeTemple?.latitude || !activeTemple.longitude || !mapRef.current) {
      return;
    }

    mapRef.current.panTo([activeTemple.latitude, activeTemple.longitude], { flying: false, duration: 220 });
  }, [activeTemple?.latitude, activeTemple?.longitude, mapReady]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      {sidebarTop ? <div className="lg:hidden">{sidebarTop}</div> : null}

      <LiquidGlassCard className="relative overflow-hidden p-2">
        <div ref={mapNodeRef} className="aspect-square w-full overflow-hidden rounded-[24px] bg-muted lg:aspect-auto lg:h-[640px]" />
        {activeTemple ? (
          <div className="absolute inset-x-4 bottom-4 z-10 lg:max-w-sm">
            <TempleMapBottomSheet temple={activeTemple} />
          </div>
        ) : null}
      </LiquidGlassCard>

      <div className="hidden gap-4 self-start lg:sticky lg:top-24 lg:grid">
        {sidebarTop}
      </div>
    </div>
  );
});

function loadYmaps() {
  if (window.ymaps) {
    return new Promise<YMapsApi>((resolve) => window.ymaps?.ready(() => resolve(window.ymaps!)));
  }

  if (!window.__hramgoYmapsPromise) {
    window.__hramgoYmapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
      script.async = true;
      script.onload = () => {
        if (!window.ymaps) {
          reject(new Error("Yandex Maps API is unavailable"));
          return;
        }

        window.ymaps.ready(() => resolve(window.ymaps!));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return window.__hramgoYmapsPromise;
}
