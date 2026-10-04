import type { ParsedSchedule } from "./site-parser.mjs";
export function recurringDays(text: string): number[];
export function parseRegularReference(
  text: string,
  options: {
    templeId: string;
    sourceUrl: string;
    checkedAt: string;
    confidence?: number;
  }
): ParsedSchedule[];
