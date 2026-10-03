import type { ScheduleEntry } from "./types";
export function moscowDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}
export function servicesForDate(
  entries: ScheduleEntry[],
  date: string | undefined = undefined,
  now = new Date()
) {
  date ??= moscowDate(now);
  const valid = entries.filter((e) => {
    const age = now.getTime() - new Date(e.verifiedAt).getTime();
    return (
      e.status === "VERIFIED" &&
      e.confidence >= 0.8 &&
      age >= 0 &&
      age <= 30 * 86400000
    );
  });
  const special = valid.filter((e) => e.serviceDate === date && e.isSpecial);
  const weekday = ((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
  return valid
    .filter(
      (e) =>
        e.serviceDate === date ||
        (!e.serviceDate &&
          special.length === 0 &&
          e.weekdays?.includes(weekday) &&
          (!e.validFrom || e.validFrom <= date) &&
          (!e.validUntil || e.validUntil >= date))
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
