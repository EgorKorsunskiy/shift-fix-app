import { createAbsence, getCurrentShifts, getShifts } from "@/api/endpoints";
import { queryKeys } from "@/api/keys";
import { useAllPages, usePagedList } from "@/lib/usePagedList";
import { brusselsDate, rangeForDays } from "@/lib/dates";

export function useCurrentShifts() {
  return usePagedList({
    queryKey: queryKeys.currentShifts,
    queryFn: (cursor) => getCurrentShifts(cursor, 20),
    refetchInterval: 30_000,
  });
}

export function useTodayShifts() {
  const today = brusselsDate(new Date());
  const range = rangeForDays([today]);
  return useAllPages({
    queryKey: queryKeys.todayShifts(today),
    queryFn: (cursor) => getShifts(range.from, range.to, cursor, 100),
    refetchInterval: 30_000,
  });
}

export function useCalendarShifts(from: string, to: string) {
  return useAllPages({
    queryKey: queryKeys.calendar(from, to),
    queryFn: (cursor) => getShifts(from, to, cursor, 100),
    refetchInterval: 60_000,
  });
}

export { createAbsence };
