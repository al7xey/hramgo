"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { getParishServiceLabel } from "@/features/temples/parish-services";
import { moscowDate } from "@/features/temples/schedules";
import { metroLines } from "@/features/temples/metro";
import type {
  TempleSearchInput,
  TransitStationOptionView
} from "@/features/temples/types";
const days = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье"
];
const field =
  "h-11 min-w-0 w-full max-w-full rounded-[18px] border border-card-border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-action";
export function WorshipFilters({
  input: d,
  districts,
  serviceKinds
}: {
  input: TempleSearchInput;
  districts: string[];
  serviceKinds: NonNullable<TempleSearchInput["service"]>;
}) {
  const [open, setOpen] = useState(false),
    [mode, setMode] = useState(d.scheduleMode ?? (d.date ? "date" : "regular")),
    [metros, setMetros] = useState<TransitStationOptionView[]>([]),
    [station, setStation] = useState(""),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [today, setToday] = useState(d.date ?? "");
  useEffect(() => {
    if (!today) setToday(moscowDate());
  }, [today]);
  useEffect(() => {
    if (!open || metros.length) return;
    const c = new AbortController();
    setBusy(true);
    setError(false);
    fetch("/data/filter-options.json", { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("stations");
        setMetros((await r.json()).metros ?? []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!c.signal.aborted) setBusy(false);
      });
    return () => c.abort();
  }, [open, metros.length, retry]);
  const initialWorship =
    d.worship ?? (d.eveningTime ? "evening" : d.liturgyTime ? "liturgy" : "");
  const initialTime = d.timeFrom ?? d.eveningTime ?? d.liturgyTime;
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        size="lg"
        className="justify-between"
        aria-expanded={open}
        aria-controls="worship-filter-panel"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Фильтры
        <span aria-hidden>{open ? "−" : "+"}</span>
      </Button>
      {open && (
        <LiquidGlassCard id="worship-filter-panel" className="p-4">
          <form action="/temples/" className="grid gap-4">
            <input type="hidden" name="query" value={d.query ?? ""} />
            {!districts.length &&
              d.district?.map((value) => (
                <input
                  key={value}
                  type="hidden"
                  name="district"
                  value={value}
                />
              ))}
            {(busy || error) &&
              d.metro?.map((value) => (
                <input key={value} type="hidden" name="metro" value={value} />
              ))}
            {d.latitude != null && d.longitude != null && (
              <>
                <input type="hidden" name="latitude" value={d.latitude} />
                <input type="hidden" name="longitude" value={d.longitude} />
                <input type="hidden" name="sort" value="distance" />
                <label className="grid gap-1 text-sm">
                  Расстояние
                  <select
                    name="radiusKm"
                    defaultValue={d.radiusKm ?? 5}
                    className={field}
                  >
                    {[1, 3, 5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        До {n} км
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <fieldset className="grid gap-3">
              <legend className="mb-2 font-semibold">Богослужение</legend>
              <label className="grid gap-1 text-sm">
                Режим расписания
                <select
                  className={field}
                  name="scheduleMode"
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as "regular" | "date")
                  }
                >
                  <option value="regular">Обычная неделя</option>
                  <option value="date">На конкретную дату</option>
                </select>
              </label>
              {mode === "date" ? (
                <label className="grid gap-1 text-sm">
                  Дата
                  <input
                    className={field}
                    type="date"
                    name="date"
                    required
                    defaultValue={today}
                  />
                </label>
              ) : (
                <label className="grid gap-1 text-sm">
                  День недели
                  <select
                    className={field}
                    name="weekday"
                    defaultValue={d.weekday ?? ""}
                  >
                    <option value="">Любой день</option>
                    {days.map((day, i) => (
                      <option key={day} value={i + 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-1 text-sm">
                Тип службы
                <select
                  name="worship"
                  defaultValue={initialWorship}
                  className={field}
                >
                  <option value="">Любая служба</option>
                  {[
                    ["liturgy", "Литургия"],
                    ["evening", "Вечерняя служба"],
                    ["vigil", "Всенощное бдение"],
                    ["confession", "Исповедь"],
                    ["prayer", "Молебен"]
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["timeFrom", "Не раньше", initialTime],
                  [
                    "timeTo",
                    "Не позже",
                    d.timeTo ?? d.eveningTime ?? d.liturgyTime
                  ]
                ].map(([name, label, value]) => (
                  <label key={name} className="grid min-w-0 gap-1 text-sm">
                    {label}
                    <input
                      className={`${field} time-field`}
                      type="time"
                      name={name}
                      defaultValue={
                        value
                          ? value.includes(":")
                            ? value.padStart(5, "0")
                            : value.padStart(2, "0") + ":00"
                          : undefined
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {mode === "date"
                  ? "Показаны только допустимые подтверждённые записи. Отсутствие результата не означает отсутствия службы."
                  : "Обычное расписание по дням недели. Справочные сведения уточняйте; в праздники время меняется."}
              </p>
            </fieldset>
            <details className="details-panel rounded-[22px] border border-card-border p-3">
              <summary className="cursor-pointer font-semibold">
                Станции метро, МЦК и МЦД
              </summary>
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-sm">
                  Найти станцию
                  <input
                    className={field}
                    type="search"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    placeholder="Название станции"
                  />
                </label>
                {busy && <p role="status">Загрузка станций…</p>}
                {error && (
                  <div role="alert">
                    Не удалось загрузить станции.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setRetry((v) => v + 1)}
                    >
                      Повторить
                    </button>
                  </div>
                )}
                <label className="grid gap-1 text-sm">
                  Станция
                  <select
                    name="metro"
                    className={field}
                    defaultValue={d.metro?.[0] ?? ""}
                    disabled={busy || error}
                  >
                    <option value="">Любая станция</option>
                    {metros
                      .filter(
                        (m) =>
                          (d.metro ?? []).includes(m.name) ||
                          m.name
                            .toLocaleLowerCase("ru")
                            .includes(station.toLocaleLowerCase("ru"))
                      )
                      .map((m) => (
                        <option key={`${m.name}-${m.lineId}`} value={m.name}>
                          {m.name} · {m.lineName}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </details>
            <details className="details-panel rounded-[22px] border border-card-border p-3">
              <summary className="cursor-pointer font-semibold">
                Ещё фильтры
              </summary>
              <div className="mt-3 grid gap-4">
                <label className="grid gap-1 text-sm">
                  Тип объекта
                  <select
                    className={field}
                    name="objectType"
                    defaultValue={d.objectType ?? "all"}
                  >
                    <option value="all">Все объекты</option>
                    <option value="church">Храмы</option>
                    <option value="monastery">Монастыри</option>
                  </select>
                </label>
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-semibold">
                    При храме
                  </legend>
                  {serviceKinds.map((k) => (
                    <Check
                      key={k}
                      name="service"
                      value={k}
                      label={getParishServiceLabel(k)}
                      checked={d.service?.includes(k)}
                    />
                  ))}
                </fieldset>
                {districts.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold">
                      Районы Москвы
                    </summary>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Район указан не у всех храмов. Для полного поиска
                      используйте станцию, улицу или карту.
                    </p>
                    <div className="mt-2 grid gap-2">
                      {districts.map((x) => (
                        <Check
                          key={x}
                          name="district"
                          value={x}
                          label={x}
                          checked={d.district?.includes(x)}
                        />
                      ))}
                    </div>
                  </details>
                )}
                {[
                  ["hasSchedule", "Есть расписание", d.hasSchedule],
                  ["hasWebsite", "Есть сайт", d.hasWebsite],
                  ["hasPhotos", "Есть фото", d.hasPhotos]
                ].map(([name, label, value]) => (
                  <Check
                    key={String(name)}
                    name={String(name)}
                    value="true"
                    label={String(label)}
                    checked={value === true}
                  />
                ))}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">
                    Линии транспорта
                  </summary>
                  <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto">
                    {metroLines.map((line) => (
                      <Check
                        key={line.id}
                        name="metroLine"
                        value={line.id}
                        label={line.name}
                        checked={d.metroLine?.includes(line.id)}
                      />
                    ))}
                  </div>
                </details>
              </div>
            </details>
            <div className="sticky bottom-24 z-10 grid grid-cols-2 gap-2 rounded-[22px] bg-background py-2 md:bottom-0">
              <Button type="submit">Применить</Button>
              <Button asChild variant="outline">
                <Link
                  href={`/temples/?${new URLSearchParams(d.query ? { query: d.query } : {})}`}
                >
                  Сбросить
                </Link>
              </Button>
            </div>
          </form>
        </LiquidGlassCard>
      )}
    </div>
  );
}
function Check({
  name,
  value,
  label,
  checked
}: {
  name: string;
  value: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[18px] border border-card-border bg-background px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="size-4 shrink-0 accent-action"
        name={name}
        value={value}
        defaultChecked={checked}
      />
      <span>{label}</span>
    </label>
  );
}
