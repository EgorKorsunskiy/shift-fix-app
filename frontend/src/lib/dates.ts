import { enGB, fr, nl } from "date-fns/locale";
import type { Locale } from "date-fns";

export const BRUSSELS = "Europe/Brussels";

const API_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z$/;

export function parseApiUtc(value: string): Date {
  const match = API_UTC.exec(value);
  if (!match) {
    throw new Error("Invalid API timestamp");
  }
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}

/** UTC timestamp at minute precision, `YYYY-MM-DDTHH:MMZ`. */
export function toApiUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}Z`;
}

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant;
}

/** Interpret a `yyyy-MM-ddTHH:mm` wall time in Europe/Brussels as a UTC instant. */
export function brusselsWallTimeToUtc(local: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error("Invalid local datetime");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wallAsUtc - zoneOffsetMs(wallAsUtc, BRUSSELS);
  utc = wallAsUtc - zoneOffsetMs(utc, BRUSSELS);
  return new Date(utc);
}

export function brusselsLocalInputToApi(local: string): string {
  return toApiUtc(brusselsWallTimeToUtc(local));
}

export function dateLocale(language: string): Locale {
  if (language.startsWith("nl")) return nl;
  if (language.startsWith("fr")) return fr;
  return enGB;
}

export function intlLocale(language: string): string {
  if (language.startsWith("nl")) return "nl-BE";
  if (language.startsWith("fr")) return "fr-BE";
  return "en-GB";
}

export function formatBrussels(utc: string, options: Intl.DateTimeFormatOptions, language: string): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    timeZone: BRUSSELS,
    hourCycle: "h23",
    ...options,
  }).format(parseApiUtc(utc));
}

export function formatTime(utc: string, language: string): string {
  return formatBrussels(utc, { hour: "2-digit", minute: "2-digit" }, language);
}

export function formatDateTime(utc: string, language: string): string {
  return formatBrussels(
    utc,
    { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
    language,
  );
}

export function formatDate(utc: string, language: string): string {
  return formatBrussels(utc, { weekday: "long", day: "numeric", month: "long" }, language);
}

export function formatDayLabel(date: string, language: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(language), {
    timeZone: BRUSSELS,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatIsoDate(isoDate: string, language: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(intlLocale(language), {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function brusselsDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRUSSELS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function isoWeekday(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function startOfIsoWeek(isoDate: string): string {
  return addCalendarDays(isoDate, -(isoWeekday(isoDate) - 1));
}

export function utcToBrusselsInput(utc: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRUSSELS,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(parseApiUtc(utc));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

export function nowApiUtc(now = new Date()): string {
  return toApiUtc(now);
}

export function endOfTodayApi(now = new Date()): string {
  return brusselsLocalInputToApi(`${brusselsDate(now)}T23:59`);
}

export type CalendarView = "week" | "day";

export function visibleDays(anchor: Date, view: CalendarView): string[] {
  const today = brusselsDate(anchor);
  if (view === "day") return [today];
  const monday = startOfIsoWeek(today);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(monday, index));
}

export function rangeForDays(days: string[]): { from: string; to: string } {
  const from = brusselsLocalInputToApi(`${days[0]}T00:00`);
  const to = brusselsLocalInputToApi(`${addCalendarDays(days[days.length - 1], 1)}T00:00`);
  return { from, to };
}
