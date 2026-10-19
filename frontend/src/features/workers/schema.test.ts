import type { WorkerDetail } from "@/api/types";
import { diffWorker, workerFormSchema, toFormValues } from "@/features/workers/schema";

function worker(): WorkerDetail {
  return {
    workerId: 7,
    firstName: "Jonas",
    lastName: "Willems",
    contractType: "part_time",
    contractHoursPerWeek: 32,
    hourlyRateCents: 1650,
    priorityFactor: 2,
    language: "nl",
    studentHoursExternalYtd: 0,
    isActive: true,
    qualifications: [{ code: "barista", name: "Barista", validUntil: null }],
    contactChannels: [{ type: "telegram", address: "100007", isPreferred: true }],
    workedHoursThisWeek: 12,
  };
}

describe("worker form", () => {
  it("sends only changed fields", () => {
    const original = worker();
    const values = toFormValues(original);
    values.hourlyRateEur = 17.5;
    values.priorityFactor = 3;
    expect(diffWorker(original, values)).toEqual({ hourlyRateCents: 1750, priorityFactor: 3 });
  });

  it("returns null when nothing changed", () => {
    const original = worker();
    expect(diffWorker(original, toFormValues(original))).toBeNull();
  });

  it("rejects two preferred channels and a priority outside 0–3", () => {
    const values = toFormValues(worker());
    values.contactChannels = [
      { type: "telegram", address: "1", isPreferred: true },
      { type: "phone", address: "+3200", isPreferred: true },
    ];
    values.priorityFactor = 4;
    const parsed = workerFormSchema.safeParse(values);
    expect(parsed.success).toBe(false);
  });

  it("rejects student hours on a non-student contract", () => {
    const values = toFormValues(worker());
    values.studentHoursExternalYtd = 12;
    expect(workerFormSchema.safeParse(values).success).toBe(false);
  });
});
