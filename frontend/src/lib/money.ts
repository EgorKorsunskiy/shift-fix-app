import { intlLocale } from "./dates";

export function centsToEur(cents: number): number {
  return cents / 100;
}

export function eurToCents(eur: number): number {
  return Math.round(eur * 100);
}

export function formatEur(cents: number, language: string): string {
  return new Intl.NumberFormat(intlLocale(language), {
    style: "currency",
    currency: "EUR",
  }).format(centsToEur(cents));
}
