import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

type Page<TItem> = { items: TItem[]; nextCursor: string | null };

export function usePagedList<TItem>({
  queryKey,
  queryFn,
  refetchInterval,
  enabled = true,
}: {
  queryKey: QueryKey;
  queryFn: (cursor: string | null) => Promise<Page<TItem>>;
  refetchInterval?: number | false;
  enabled?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return { ...query, items };
}

export function useAllPages<TItem>(args: {
  queryKey: QueryKey;
  queryFn: (cursor: string | null) => Promise<Page<TItem>>;
  refetchInterval?: number | false;
  enabled?: boolean;
}) {
  const query = usePagedList(args);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return query;
}
