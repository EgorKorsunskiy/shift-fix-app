import { z } from "zod";
import type { WorkerDetail, WorkerUpdate } from "@/api/types";
import { eurToCents } from "@/lib/money";

const channelTypes = ["telegram", "sms", "whatsapp", "email", "phone"] as const;

export const workerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "required"),
    lastName: z.string().trim().min(1, "required"),
    contractType: z.enum(["full_time", "part_time", "student"]),
    contractHoursPerWeek: z.number({ invalid_type_error: "required" }).positive("hours"),
    hourlyRateEur: z.number({ invalid_type_error: "required" }).min(0, "nonNegative"),
    priorityFactor: z.number({ invalid_type_error: "priority" }).int("priority").min(0, "priority").max(3, "priority"),
    language: z.enum(["nl", "fr", "en"]),
    studentHoursExternalYtd: z.number({ invalid_type_error: "required" }).min(0, "nonNegative"),
    isActive: z.boolean(),
    qualifications: z.array(
      z.object({
        code: z.string().min(1, "required"),
        validUntil: z.string(),
      }),
    ),
    contactChannels: z.array(
      z.object({
        type: z.enum(channelTypes),
        address: z.string().trim().min(1, "required"),
        isPreferred: z.boolean(),
      }),
    ),
  })
  .superRefine((value, ctx) => {
    const codes = value.qualifications.map((item) => item.code);
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({ code: "custom", message: "duplicateQualification", path: ["qualifications"] });
    }
    const types = value.contactChannels.map((item) => item.type);
    if (new Set(types).size !== types.length) {
      ctx.addIssue({ code: "custom", message: "duplicateChannel", path: ["contactChannels"] });
    }
    if (value.contactChannels.filter((item) => item.isPreferred).length > 1) {
      ctx.addIssue({ code: "custom", message: "onePreferred", path: ["contactChannels"] });
    }
    if (value.contractType !== "student" && value.studentHoursExternalYtd !== 0) {
      ctx.addIssue({ code: "custom", message: "studentOnly", path: ["studentHoursExternalYtd"] });
    }
  });

export type WorkerFormValues = z.infer<typeof workerFormSchema>;

export function toFormValues(worker: WorkerDetail): WorkerFormValues {
  return {
    firstName: worker.firstName,
    lastName: worker.lastName,
    contractType: worker.contractType,
    contractHoursPerWeek: worker.contractHoursPerWeek,
    hourlyRateEur: worker.hourlyRateCents / 100,
    priorityFactor: worker.priorityFactor,
    language: worker.language,
    studentHoursExternalYtd: worker.studentHoursExternalYtd,
    isActive: worker.isActive,
    qualifications: worker.qualifications.map((item) => ({
      code: item.code,
      validUntil: item.validUntil ?? "",
    })),
    contactChannels: worker.contactChannels.map((item) => ({ ...item })),
  };
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function diffWorker(original: WorkerDetail, values: WorkerFormValues): WorkerUpdate | null {
  const patch: WorkerUpdate = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  if (firstName !== original.firstName) patch.firstName = firstName;
  if (lastName !== original.lastName) patch.lastName = lastName;
  if (values.contractType !== original.contractType) patch.contractType = values.contractType;
  if (roundHours(values.contractHoursPerWeek) !== original.contractHoursPerWeek) {
    patch.contractHoursPerWeek = roundHours(values.contractHoursPerWeek);
  }
  const cents = eurToCents(values.hourlyRateEur);
  if (cents !== original.hourlyRateCents) patch.hourlyRateCents = cents;
  if (values.priorityFactor !== original.priorityFactor) patch.priorityFactor = values.priorityFactor;
  if (values.language !== original.language) patch.language = values.language;
  if (values.studentHoursExternalYtd !== original.studentHoursExternalYtd) {
    patch.studentHoursExternalYtd = values.studentHoursExternalYtd;
  }
  if (values.isActive !== original.isActive) patch.isActive = values.isActive;

  const qualifications = values.qualifications.map((item) => ({
    code: item.code,
    validUntil: item.validUntil ? item.validUntil : null,
  }));
  const originalQualifications = original.qualifications.map((item) => ({
    code: item.code,
    validUntil: item.validUntil,
  }));
  if (JSON.stringify(qualifications) !== JSON.stringify(originalQualifications)) {
    patch.qualifications = qualifications;
  }

  const channels = values.contactChannels.map((item) => ({
    type: item.type,
    address: item.address.trim(),
    isPreferred: item.isPreferred,
  }));
  if (JSON.stringify(channels) !== JSON.stringify(original.contactChannels)) {
    patch.contactChannels = channels;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
