export const QUALIFICATION_CATALOG = [
  { code: "cashier", name: "Cashier" },
  { code: "bakery", name: "Bakery" },
  { code: "barista", name: "Barista" },
  { code: "forklift", name: "Forklift" },
  { code: "first_aid", name: "First aid" },
  { code: "floor", name: "Floor" },
] as const;

export type QualificationCode = (typeof QUALIFICATION_CATALOG)[number]["code"];

export function qualificationName(code: string): string | undefined {
  return QUALIFICATION_CATALOG.find((item) => item.code === code)?.name;
}
