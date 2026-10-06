export const METRIKA_COUNTER_ID = 113502041;
export const ANALYTICS_CONSENT_KEY = "hramgo-analytics-consent";

/** Never transmit search, location, payment identifiers, or URL fragments. */
export function analyticsPageUrl(input: string): string {
  const url = new URL(input, "https://hramgo.ru");
  if (url.origin !== "https://hramgo.ru") return url.origin + "/";
  const path = url.pathname;
  const allowed =
    /^\/(?:temples\/(?:[a-z0-9-]+\/)?|map\/|sources\/|support\/|legal\/[a-z-]+\/)?$/;
  return "https://hramgo.ru" + (allowed.test(path) ? path : "/");
}
