import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "не указана";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function routeToYandexMaps(address?: string | null, latitude?: number | null, longitude?: number | null) {
  const target = latitude && longitude ? `${latitude},${longitude}` : address;
  return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(target ?? "Москва")}&rtt=mt`;
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}
