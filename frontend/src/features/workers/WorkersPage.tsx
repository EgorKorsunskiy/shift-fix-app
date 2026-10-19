import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { QualificationChips } from "@/components/domain/QualificationChips";
import { WorkerName } from "@/components/domain/WorkerName";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadMore } from "@/components/ui/LoadMore";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useWorker, useWorkers } from "./api";
import { WorkerPanel } from "./WorkerPanel";

export default function WorkersPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const openId = Number(params.get("open"));
  const [text, setText] = useState(q);

  useEffect(() => {
    setText(q);
  }, [q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (text === q) return;
      const next = new URLSearchParams(params);
      if (text) next.set("q", text);
      else next.delete("q");
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [text, q, params, setParams]);

  const query = useWorkers(q);

  function toggle(workerId: number) {
    const next = new URLSearchParams(params);
    if (next.get("open") === String(workerId)) next.delete("open");
    else next.set("open", String(workerId));
    setParams(next);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("workers.title")}</h1>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("workers.search")}
        aria-label={t("workers.searchLabel")}
        type="search"
      />
      {query.isLoading ? <ListSkeleton /> : null}
      {query.isError ? (
        <ErrorState
          message={t(errorMessageKey(query.error instanceof ApiError ? query.error.code : undefined))}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.isError && query.items.length === 0 ? (
        <EmptyState title={t("workers.empty")} />
      ) : null}
      {query.items.length > 0 ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {query.items.map((worker) => {
            const open = openId === worker.workerId;
            return (
              <li key={worker.workerId}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left sm:flex-row sm:items-center"
                  aria-expanded={open}
                  onClick={() => toggle(worker.workerId)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar first={worker.firstName} last={worker.lastName} />
                    <span>
                      <WorkerName first={worker.firstName} last={worker.lastName} />
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-slate-500">
                        {t(`contract.${worker.contractType}`)}
                        <QualificationChips items={worker.qualifications} />
                      </span>
                    </span>
                  </span>
                </button>
                {open ? <WorkerDetail workerId={worker.workerId} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <LoadMore hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} />
    </div>
  );
}

function WorkerDetail({ workerId }: { workerId: number }) {
  const { t } = useTranslation();
  const query = useWorker(workerId, true);
  if (query.isLoading) return <div className="px-4 py-3"><ListSkeleton rows={2} /></div>;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === "WORKER_NOT_FOUND") {
      return <p className="px-4 py-3 text-red-700">{t("errors.WORKER_NOT_FOUND")}</p>;
    }
    return (
      <div className="px-4 py-3">
        <ErrorState message={t(errorMessageKey(query.error instanceof ApiError ? query.error.code : undefined))} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (!query.data) return null;
  return <WorkerPanel key={query.data.workerId} worker={query.data} />;
}
