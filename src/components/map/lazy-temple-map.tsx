"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
import type { TempleMapProps } from "./temple-map";

export function LazyTempleMap(props: TempleMapProps) {
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [Component, setComponent] =
    useState<ComponentType<TempleMapProps> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );
    if (node.current) observer.observe(node.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    import("./temple-map")
      .then((module) => {
        if (active) setComponent(() => module.TempleMap);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [visible]);
  return (
    <div ref={node}>
      {Component ? (
        <Component {...props} />
      ) : (
        <div
          className={`grid gap-4 ${props.sidebarTop ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""} xl:items-start`}
        >
          {props.sidebarTop && (
            <div className="xl:hidden">{props.sidebarTop}</div>
          )}
          <LiquidGlassCard className="relative overflow-hidden p-2">
            <div
              className="h-[420px] w-full rounded-[24px] bg-muted md:h-[520px] xl:h-[640px]"
              role={error ? "alert" : "status"}
              aria-label={error ? "Карта не загрузилась" : "Загрузка карты"}
            >
              {error && (
                <div className="grid gap-3 p-5">
                  <p>Не удалось загрузить карту. Поиск и список доступны.</p>
                  <Button onClick={() => window.location.reload()}>
                    Обновить страницу
                  </Button>
                </div>
              )}
            </div>
          </LiquidGlassCard>
          {props.sidebarTop && (
            <div className="hidden xl:block">{props.sidebarTop}</div>
          )}
        </div>
      )}
    </div>
  );
}
