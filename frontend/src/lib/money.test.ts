import { centsToEur, eurToCents, formatEur } from "@/lib/money";

describe("money", () => {
  it("converts cents and euros", () => {
    expect(centsToEur(1650)).toBe(16.5);
    expect(eurToCents(16.5)).toBe(1650);
    expect(eurToCents(16.505)).toBe(1651);
  });

  it("formats euros for the active locale", () => {
    expect(formatEur(1650, "en")).toContain("16.50");
    expect(formatEur(1650, "nl")).toContain("16,50");
  });
});
