import { CalendarClock, Pencil, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { ChangeDiff, formatActor } from "@/components/domain/ChangeDiff";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadMore } from "@/components/ui/LoadMore";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/dates";
import { NotFoundPage } from "@/app/NotFoundPage";
import { useHistoryWorker, useWorkerHistory } from "./api";

const ACTIONS = new Set([
  "absence_reported",
  "shift_opened",
  "offer_sent",
  "offer_declined",
  "offer_accepted",
  "shift_assigned",
  "assignment_rejected",
  "worker_updated",
]);

export default function HistoryPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const workerId = Number(params.workerId);
  const workerQuery = useHistoryWorker(workerId);
  const historyQuery = useWorkerHistory(workerId);

  if (!Number.isFinite(workerId)) return <NotFoundPage />;
  if (workerQuery.isError && workerQuery.error instanceof ApiError && workerQuery.error.code === "WORKER_NOT_FOUND") {
    return <NotFoundPage />;
  }

  const name =
    workerQuery.data ? `${workerQuery.data.firstName} ${workerQuery.data.lastName}` : t("common.loading");

  return (
    <div className="space-y-4">
      <Link to={`/workers?open=${workerId}`} className={buttonClass({ variant: "ghost", className: "px-0" })}>
        {t("history.back")}
      </Link>
      <h1 className="text-2xl font-semibold">{name}</h1>
      {historyQuery.isLoading ? <ListSkeleton /> : null}
      {historyQuery.isError ? (
        <ErrorState
          message={t(errorMessageKey(historyQuery.error instanceof ApiError ? historyQuery.error.code : undefined))}
          onRetry={() => void historyQuery.refetch()}
        />
      ) : null}
      {!historyQuery.isLoading && !historyQuery.isError && historyQuery.items.length === 0 ? (
        <EmptyState title={t("history.empty")} />
      ) : null}
      {historyQuery.items.length > 0 ? (
        <ol className="space-y-3">
          {historyQuery.items.map((entry, index) => {
            const Icon = iconFor(entry.action);
            const label = ACTIONS.has(entry.action) ? t(`action.${entry.action}`) : t("action.unknown");
            return (
              <li key={`${entry.occurredAt}-${entry.action}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-slate-500">
                      {formatDateTime(entry.occurredAt, i18n.language)}
                      {" · "}
                      {formatActor(entry.actor, t)}
                      {entry.shiftId ? (
                        <>
                          {" · "}
                          <Link className="text-indigo-700 underline" to={`/shifts/${entry.shiftId}/replacements`}>
                            {t("history.shiftLink", { id: entry.shiftId })}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <ChangeDiff changes={entry.changes} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      <LoadMore
        hasMore={historyQuery.hasNextPage}
        loading={historyQuery.isFetchingNextPage}
        onClick={() => void historyQuery.fetchNextPage()}
      />
    </div>
  );
}

function iconFor(action: string) {
  if (action === "worker_updated") return Pencil;
  if (action.startsWith("offer") || action === "shift_assigned" || action === "assignment_rejected") return Send;
  return CalendarClock;
}
