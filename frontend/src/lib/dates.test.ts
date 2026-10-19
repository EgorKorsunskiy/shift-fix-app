import { brusselsLocalInputToApi, parseApiUtc, toApiUtc } from "@/lib/dates";

describe("brussels time", () => {
  it("converts a summer wall time to UTC", () => {
    expect(brusselsLocalInputToApi("2026-10-19T20:48")).toBe("2026-10-19T18:48Z");
  });

  it("converts a winter wall time to UTC", () => {
    expect(brusselsLocalInputToApi("2026-01-15T12:00")).toBe("2026-01-15T11:00Z");
  });

  it("formats UTC with minute precision", () => {
    expect(toApiUtc(parseApiUtc("2026-10-20T07:05Z"))).toBe("2026-10-20T07:05Z");
  });
});
