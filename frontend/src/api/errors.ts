const KNOWN_ERRORS = [
  "SHIFT_NOT_OPEN",
  "ALREADY_OFFERED",
  "NOT_ELIGIBLE",
  "NO_CANDIDATES_LEFT",
  "CHANNEL_UNAVAILABLE",
  "WORKER_NOT_FOUND",
  "SHIFT_NOT_FOUND",
  "VALIDATION_ERROR",
] as const;

export type KnownErrorCode = (typeof KNOWN_ERRORS)[number];

const known = new Set<string>(KNOWN_ERRORS);

export function errorMessageKey(code: string | undefined): string {
  if (code && known.has(code)) return `errors.${code}`;
  return "errors.generic";
}
