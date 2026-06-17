"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { TempleMapBottomSheet } from "@/components/map/temple-map-bottom-sheet";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { TempleMapView } from "@/features/temples/types";

type YMap = {
  geoObjects: { add: (object: YClusterer) => void };
  setBounds: (bounds: unknown, options: Record<string, unknown>) => void;
  panTo: (coords: [number, number], options: Record<string, unknown>) => void;
};

type YClusterer = {
  add: (objects: YPlacemark[]) => void;
  removeAll: () => void;
  getBounds: () => unknown;
};

type YPlacemark = {
  events: { add: (eventName: string, handler: () => void) => void };
};

type YMapsApi = {
  ready: (handler: () => void) => void;
  Map: new (node: HTMLElement, state: Record<string, unknown>) => YMap;
  Clusterer: new (options: Record<string, unknown>) => YClusterer;
  Placemark: new (coords: [number, number], properties: Record<string, unknown>, options: Record<string, unknown>) => YPlacemark;
};

declare global {
  interface Window {
    ymaps?: YMapsApi;
    __hramgoYmapsPromise?: Promise<YMapsApi>;
  }
}

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

export function TempleMap({ temples, activeSlug }: { temples: TempleMapView[]; activeSlug?: string }) {
  const points = useMemo(() => temples.filter((temple) => temple.latitude && temple.longitude), [temples]);
  const pointsKey = useMemo(() => points.map((temple) => `${temple.id}:${temple.latitude}:${temple.longitude}`).join("|"), [points]);
  const initialTemple = points.find((temple) => temple.slug === activeSlug) ?? points[0];
  const [selectedSlug, setSelectedSlug] = useState(activeSlug ?? initialTemple?.slug);
  const [mapReady, setMapReady] = useState(false);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<YMap | null>(null);
  const clustererRef = useRef<YClusterer | null>(null);
  const fittedPointsKeyRef = useRef<string | null>(null);
  const activeTemple = points.find((temple) => temple.slug === selectedSlug) ?? initialTemple;

  useEffect(() => {
    let cancelled = false;

    loadYmaps()
      .then((ymaps) => {
        if (cancelled || !mapNodeRef.current || mapRef.current) {
          return;
        }

        const center: [number, number] =
          activeTemple?.latitude && activeTemple.longitude ? [activeTemple.latitude, activeTemple.longitude] : MOSCOW_CENTER;
        mapRef.current = new ymaps.Map(mapNodeRef.current, {
          center,
          zoom: points.length > 1 ? 10 : 15,
          controls: ["zoomControl", "geolocationControl", "fullscreenControl"]
        });
        clustererRef.current = new ymaps.Clusterer({
          preset: "islands#blueClusterIcons",
          groupByCoordinates: false,
          clusterDisableClickZoom: false
        });
        mapRef.current.geoObjects.add(clustererRef.current);
        setMapReady(true);
      })
      .catch(() => setMapReady(false));

    return () => {
      cancelled = true;
    };
  }, [activeTemple?.latitude, activeTemple?.longitude, points.length]);

  useEffect(() => {
    if (!mapReady || !window.ymaps || !clustererRef.current) {
      return;
    }

    const ymaps = window.ymaps;
    clustererRef.current.removeAll();
    const placemarks = points.map((temple) => {
      const coords: [number, number] = [temple.latitude ?? MOSCOW_CENTER[0], temple.longitude ?? MOSCOW_CENTER[1]];
      const placemark = new ymaps.Placemark(
        coords,
        {
          hintContent: temple.shortName ?? temple.name,
          balloonContentHeader: temple.shortName ?? temple.name,
          balloonContentBody: temple.address ?? "",
          balloonContentFooter: `<a href="/temples/${temple.slug}">Перейти к храму</a>`
        },
        {
          preset: temple.slug === selectedSlug ? "islands#greenIcon" : "islands#blueIcon"
        }
      );

      placemark.events.add("click", () => setSelectedSlug(temple.slug));
      return placemark;
    });

    clustererRef.current.add(placemarks);

    if (points.length > 1 && fittedPointsKeyRef.current !== pointsKey) {
      const bounds = clustererRef.current.getBounds();
      if (bounds && mapRef.current) {
        mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 32 });
        fittedPointsKeyRef.current = pointsKey;
      }
    }
  }, [mapReady, points, pointsKey, selectedSlug]);

  useEffect(() => {
    if (!mapReady || !activeTemple?.latitude || !activeTemple.longitude || !mapRef.current) {
      return;
    }

    mapRef.current.panTo([activeTemple.latitude, activeTemple.longitude], { flying: false, duration: 250 });
  }, [activeTemple?.latitude, activeTemple?.longitude, mapReady]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      <LiquidGlassCard className="overflow-hidden p-2">
        <div ref={mapNodeRef} className="aspect-square w-full overflow-hidden rounded-[24px] bg-muted lg:aspect-auto lg:h-[640px]" />
      </LiquidGlassCard>

      <div className="grid gap-3 self-start lg:sticky lg:top-24">
        {activeTemple && <TempleMapBottomSheet temple={activeTemple} />}
      </div>
    </div>
  );
}

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
