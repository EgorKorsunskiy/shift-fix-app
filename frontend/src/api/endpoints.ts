import { apiFetch, queryString } from "./client";
import type {
  AbsenceCreate,
  AbsenceCreated,
  CalendarShiftPage,
  CandidatePage,
  ContactInfo,
  CurrentShiftPage,
  ExclusionPage,
  HistoryPage,
  OfferPage,
  OfferRequest,
  OfferWave,
  ShiftDetail,
  WorkerDetail,
  WorkerRowPage,
  WorkerUpdate,
} from "./types";

export function getCurrentShifts(cursor: string | null, limit = 20) {
  return apiFetch<CurrentShiftPage>(`/shifts/current${queryString({ limit, cursor })}`);
}

export function getShifts(from: string, to: string, cursor: string | null, limit = 100) {
  return apiFetch<CalendarShiftPage>(`/shifts${queryString({ from, to, limit, cursor })}`);
}

export function getShift(shiftId: number) {
  return apiFetch<ShiftDetail>(`/shifts/${shiftId}`);
}

export function getReplacements(shiftId: number, cursor: string | null, limit = 20) {
  return apiFetch<CandidatePage>(
    `/shifts/${shiftId}/replacements${queryString({ limit, cursor })}`,
  );
}

export function getExclusions(shiftId: number, cursor: string | null, limit = 50) {
  return apiFetch<ExclusionPage>(
    `/shifts/${shiftId}/exclusions${queryString({ limit, cursor })}`,
  );
}

export function getOffers(shiftId: number, cursor: string | null, limit = 100) {
  return apiFetch<OfferPage>(`/shifts/${shiftId}/offers${queryString({ limit, cursor })}`);
}

export function sendOffers(shiftId: number, body?: OfferRequest) {
  return apiFetch<OfferWave>(`/shifts/${shiftId}/offers`, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function createAbsence(body: AbsenceCreate) {
  return apiFetch<AbsenceCreated>("/absences", { method: "POST", body: JSON.stringify(body) });
}

export function getContactInfo(workerId: number) {
  return apiFetch<ContactInfo>(`/workers/${workerId}/contact-info`);
}

export function getWorkers(search: string, cursor: string | null, limit = 20) {
  return apiFetch<WorkerRowPage>(`/workers${queryString({ search: search || undefined, limit, cursor })}`);
}

export function getWorker(workerId: number) {
  return apiFetch<WorkerDetail>(`/workers/${workerId}`);
}

export function patchWorker(workerId: number, body: WorkerUpdate) {
  return apiFetch<WorkerDetail>(`/workers/${workerId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getHistory(workerId: number, cursor: string | null, limit = 20) {
  return apiFetch<HistoryPage>(`/workers/${workerId}/history${queryString({ limit, cursor })}`);
}
