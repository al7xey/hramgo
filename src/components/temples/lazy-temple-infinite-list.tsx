"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/ui/loading-state";

export const LazyTempleInfiniteList = dynamic(
  () => import("@/components/temples/temple-infinite-list").then((module) => module.TempleInfiniteList),
  {
    ssr: false,
    loading: () => <LoadingState label="Загрузка храмов" />
  }
);
