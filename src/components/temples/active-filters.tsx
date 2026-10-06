"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { metroLines } from "@/features/temples/metro";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import { worshipLabels } from "@/features/temples/worship";
import type { TempleSearchInput } from "@/features/temples/types";

export function ActiveFilters({
  input,
  parameters,
  basePath = "/temples/"
}: {
  input: TempleSearchInput;
  parameters: string;
  basePath?: string;
}) {
  const chips: { id: string; label: string; href: string }[] = [];
  function add(key: string, label: string, value?: string, group = [key]) {
    const next = new URLSearchParams(parameters);
    if (value) {
      const remaining = next.getAll(key).filter((item) => item !== value);
      next.delete(key);
      remaining.forEach((item) => next.append(key, item));
    } else group.forEach((item) => next.delete(item));
    chips.push({
      id: key + (value ?? ""),
      label,
      href: basePath + (next.size ? "?" + next : "")
    });
  }
  input.metro?.forEach((value) => add("metro", value, value));
  input.metroLine?.forEach((value) =>
    add(
      "metroLine",
      metroLines.find((line) => line.id === value)?.name ?? value,
      value
    )
  );
  input.district?.forEach((value) => add("district", value, value));
  input.service?.forEach((value) =>
    add("service", getParishServiceLabel(value), value)
  );
  if (input.objectType && input.objectType !== "all")
    add("objectType", input.objectType === "monastery" ? "Монастыри" : "Храмы");
  if (input.date)
    add(
      "date",
      new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(
        new Date(input.date + "T12:00:00Z")
      ),
      undefined,
      ["date", "scheduleMode"]
    );
  if (input.weekday)
    add(
      "weekday",
      [
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
        "Воскресенье"
      ][input.weekday - 1]
    );
  if (input.worship)
    add("worship", worshipLabels[input.worship], undefined, [
      "worship",
      "liturgyTime",
      "eveningTime"
    ]);
  if (input.timeFrom || input.timeTo)
    add(
      "timeFrom",
      `${input.timeFrom ? "С " + input.timeFrom : ""}${input.timeFrom && input.timeTo ? " · " : ""}${input.timeTo ? "До " + input.timeTo : ""}`,
      undefined,
      ["timeFrom", "timeTo"]
    );
  if (input.liturgyTime || input.eveningTime)
    add(
      "liturgyTime",
      input.liturgyTime
        ? "Литургия " + input.liturgyTime
        : "Вечерняя служба " + input.eveningTime,
      undefined,
      ["liturgyTime", "eveningTime"]
    );
  for (const [key, label] of [
    ["hasSchedule", "Есть расписание"],
    ["hasPhotos", "Есть фото"],
    ["hasWebsite", "Есть сайт"]
  ] as const)
    if (input[key]) add(key, label);
  if (input.latitude != null && input.longitude != null)
    add("radiusKm", `До ${input.radiusKm ?? 5} км от точки поиска`, undefined, [
      "latitude",
      "longitude",
      "radiusKm",
      "sort"
    ]);
  if (!chips.length) return null;
  return (
    <div className="grid gap-2" aria-label="Активные фильтры">
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.id}>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-[18px] border border-primary/20 bg-primary-soft px-3 text-sm text-primary"
              href={chip.href}
              aria-label={"Убрать фильтр: " + chip.label}
            >
              {chip.label}
              <X className="size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        className="inline-flex min-h-11 w-fit items-center text-sm text-primary underline"
        href={
          basePath +
          (input.query ? "?" + new URLSearchParams({ query: input.query }) : "")
        }
      >
        Сбросить фильтры
      </Link>
    </div>
  );
}
