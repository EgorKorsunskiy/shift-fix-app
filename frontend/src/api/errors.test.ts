import { errorMessageKey } from "@/api/errors";

describe("error mapping", () => {
  it("maps known codes and hides unknown ones", () => {
    expect(errorMessageKey("SHIFT_NOT_OPEN")).toBe("errors.SHIFT_NOT_OPEN");
    expect(errorMessageKey("ALREADY_OFFERED")).toBe("errors.ALREADY_OFFERED");
    expect(errorMessageKey("NOT_ELIGIBLE")).toBe("errors.NOT_ELIGIBLE");
    expect(errorMessageKey("NO_CANDIDATES_LEFT")).toBe("errors.NO_CANDIDATES_LEFT");
    expect(errorMessageKey("CHANNEL_UNAVAILABLE")).toBe("errors.CHANNEL_UNAVAILABLE");
    expect(errorMessageKey("WORKER_NOT_FOUND")).toBe("errors.WORKER_NOT_FOUND");
    expect(errorMessageKey("SHIFT_NOT_FOUND")).toBe("errors.SHIFT_NOT_FOUND");
    expect(errorMessageKey("VALIDATION_ERROR")).toBe("errors.VALIDATION_ERROR");
    expect(errorMessageKey("SOMETHING_NEW")).toBe("errors.generic");
    expect(errorMessageKey(undefined)).toBe("errors.generic");
  });
});
