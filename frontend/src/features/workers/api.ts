import { useQuery } from "@tanstack/react-query";
import { getWorker, getWorkers, patchWorker } from "@/api/endpoints";
import { queryKeys } from "@/api/keys";
import { usePagedList } from "@/lib/usePagedList";

export function useWorkers(search: string) {
  return usePagedList({
    queryKey: queryKeys.workers(search),
    queryFn: (cursor) => getWorkers(search, cursor, 20),
  });
}

export function useWorker(workerId: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.worker(workerId),
    queryFn: () => getWorker(workerId),
    enabled,
  });
}

export { patchWorker };
