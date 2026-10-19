import { useQuery } from "@tanstack/react-query";
import { getExclusions, getOffers, getReplacements, getShift, sendOffers } from "@/api/endpoints";
import { queryKeys } from "@/api/keys";
import { usePagedList } from "@/lib/usePagedList";

export function useShift(shiftId: number, poll: boolean) {
  return useQuery({
    queryKey: queryKeys.shift(shiftId),
    queryFn: () => getShift(shiftId),
    enabled: Number.isFinite(shiftId),
    refetchInterval: poll ? 5_000 : false,
  });
}

export function useReplacements(shiftId: number, enabled: boolean, poll: boolean) {
  return usePagedList({
    queryKey: queryKeys.replacements(shiftId),
    queryFn: (cursor) => getReplacements(shiftId, cursor, 20),
    enabled,
    refetchInterval: poll ? 5_000 : false,
  });
}

export function useExclusions(shiftId: number, enabled: boolean) {
  return usePagedList({
    queryKey: queryKeys.exclusions(shiftId),
    queryFn: (cursor) => getExclusions(shiftId, cursor, 50),
    enabled,
  });
}

export function useOffers(shiftId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.offers(shiftId),
    queryFn: () => getOffers(shiftId, null, 100),
    enabled,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      if (query.state.error) return Math.min(30_000, 5_000 * 2 ** Math.min(query.state.fetchFailureCount, 3));
      return items.some((item) => item.status === "pending") ? 5_000 : false;
    },
  });
}

export { sendOffers };
