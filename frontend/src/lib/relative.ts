import { formatDistance } from "date-fns";
import { dateLocale, parseApiUtc } from "./dates";

export function formatRelative(utc: string, language: string, now = new Date()): string {
  return formatDistance(parseApiUtc(utc), now, {
    addSuffix: true,
    locale: dateLocale(language),
  });
}
