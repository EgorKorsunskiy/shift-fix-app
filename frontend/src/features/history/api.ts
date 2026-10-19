import { getHistory, getWorker } from "@/api/endpoints";
import { queryKeys } from "@/api/keys";
import { usePagedList } from "@/lib/usePagedList";
import { useQuery } from "@tanstack/react-query";

export function useWorkerHistory(workerId: number) {
  return usePagedList({
    queryKey: queryKeys.history(workerId),
    queryFn: (cursor) => getHistory(workerId, cursor, 20),
    enabled: Number.isFinite(workerId),
  });
}

export function useHistoryWorker(workerId: number) {
  return useQuery({
    queryKey: queryKeys.worker(workerId),
    queryFn: () => getWorker(workerId),
    enabled: Number.isFinite(workerId),
  });
}
