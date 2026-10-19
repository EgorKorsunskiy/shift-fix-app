import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CurrentShift } from "@/api/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadMore } from "@/components/ui/LoadMore";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { WorkerName } from "@/components/domain/WorkerName";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { formatTime } from "@/lib/dates";
import { useCurrentShifts } from "./api";
import { MarkAbsentDialog } from "./MarkAbsentDialog";

export function NowList() {
  const { t, i18n } = useTranslation();
  const query = useCurrentShifts();
  const [selected, setSelected] = useState<CurrentShift | null>(null);

  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) {
    const code = query.error instanceof ApiError ? query.error.code : undefined;
    return <ErrorState message={t(errorMessageKey(code))} onRetry={() => void query.refetch()} />;
  }
  if (query.items.length === 0) return <EmptyState title={t("home.emptyNow")} />;

  return (
    <>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {query.items.map((shift) => (
          <li key={shift.shiftId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar first={shift.firstName} last={shift.lastName} />
              <div className="min-w-0">
                <WorkerName first={shift.firstName} last={shift.lastName} />
                <p className="text-slate-500">
                  {shift.qualification.name}
                  {" · "}
                  {t("home.until", { time: formatTime(shift.endsAt, i18n.language) })}
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setSelected(shift)}>
              {t("home.markAbsent")}
            </Button>
          </li>
        ))}
      </ul>
      <LoadMore
        hasMore={query.hasNextPage}
        loading={query.isFetchingNextPage}
        onClick={() => void query.fetchNextPage()}
      />
      <MarkAbsentDialog shift={selected} open={selected !== null} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}
