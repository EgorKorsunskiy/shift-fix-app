export const queryKeys = {
  currentShifts: ["shifts", "current"] as const,
  calendar: (from: string, to: string) => ["shifts", "calendar", from, to] as const,
  todayShifts: (day: string) => ["shifts", "today", day] as const,
  shift: (id: number) => ["shift", id] as const,
  replacements: (id: number) => ["shift", id, "replacements"] as const,
  exclusions: (id: number) => ["shift", id, "exclusions"] as const,
  offers: (id: number) => ["shift", id, "offers"] as const,
  workers: (search: string) => ["workers", { search }] as const,
  worker: (id: number) => ["worker", id] as const,
  history: (id: number) => ["worker", id, "history"] as const,
  contact: (id: number) => ["worker", id, "contact"] as const,
};
