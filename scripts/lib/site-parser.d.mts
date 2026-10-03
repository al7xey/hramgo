import type { CheerioAPI } from "cheerio";
export type ExtractionOptions = {
  templeId: string;
  sourceUrl: string;
  checkedAt: string;
  context?: string;
  method?: string;
  official?: boolean;
};
export type ParsedSchedule = {
  id: string;
  temple_id: string;
  service_date: string | null;
  weekdays: number[] | null;
  starts_at: string;
  kind: string;
  title: string;
  comment: string;
  is_special: boolean;
  valid_from: string | null;
  valid_until: string | null;
  source_url: string;
  verified_at: string;
  last_checked_at: string;
  confidence: number;
  status: string;
  extraction_method: string;
  scope_note: string | null;
};
export function parseScheduleHtml(
  html: string,
  options: ExtractionOptions
): ParsedSchedule[];
export function parseScheduleText(
  text: string,
  options: ExtractionOptions
): ParsedSchedule[];
export function cleanDocument(html: string): CheerioAPI;
export function inspectPage(
  html: string,
  url: string
): {
  links: { url: string; title: string; score: number; asset: boolean }[];
  phones: string[];
  emails: string[];
  socials: { url: string; type: string }[];
  coordinates: { latitude: number; longitude: number }[];
  description: string | null;
  title: string;
  text: string;
  canonical: string | null;
  published: string | null;
  $: CheerioAPI;
};
