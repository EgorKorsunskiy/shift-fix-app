import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { RuleBadge } from "@/components/domain/RuleBadge";
import { WorkerName } from "@/components/domain/WorkerName";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadMore } from "@/components/ui/LoadMore";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useExclusions } from "./api";

export function ExclusionList({ shiftId, enabled }: { shiftId: number; enabled: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const query = useExclusions(shiftId, enabled && open);
  const countLabel = query.data ? query.items.length : "…";

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <Button
        variant="ghost"
        className="w-full justify-between"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{t("replacements.excluded", { count: open && query.data ? query.items.length : countLabel })}</span>
      </Button>
      {open ? (
        <div className="space-y-3 px-4 pb-4">
          {query.isLoading ? <ListSkeleton rows={3} /> : null}
          {query.isError && !(query.error instanceof ApiError && query.error.code === "SHIFT_NOT_OPEN") ? (
            <ErrorState message={t(errorMessageKey(query.error instanceof ApiError ? query.error.code : undefined))} onRetry={() => void query.refetch()} />
          ) : null}
          <ul className="divide-y divide-slate-200">
            {query.items.map((worker) => (
              <li key={worker.workerId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <WorkerName first={worker.firstName} last={worker.lastName} />
                <span className="flex flex-wrap gap-1">
                  {worker.failedRules.map((rule) => (
                    <RuleBadge key={rule} rule={rule} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <LoadMore hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} />
        </div>
      ) : null}
    </section>
  );
}
