import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { queryKeys } from "@/api/keys";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ShiftTime } from "@/components/domain/ShiftTime";
import { formatDate } from "@/lib/dates";
import { sendOffers, useOffers, useReplacements, useShift } from "./api";
import { CandidateList } from "./CandidateList";
import { ExclusionList } from "./ExclusionList";
import { NotFoundPage } from "@/app/NotFoundPage";

export default function ReplacementsPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const shiftId = Number(params.shiftId);
  const location = useLocation();
  const absentName = (location.state as { absentName?: string } | null)?.absentName;
  const toast = useToast();
  const queryClient = useQueryClient();
  const offersQuery = useOffers(shiftId, Number.isFinite(shiftId));
  const pending = offersQuery.data?.items.some((offer) => offer.status === "pending") ?? false;
  const shiftQuery = useShift(shiftId, pending);
  const shiftOpen = shiftQuery.data?.status === "open";
  const replacementsQuery = useReplacements(shiftId, shiftOpen === true, pending);
  const filled =
    shiftQuery.data?.status === "scheduled" ||
    (replacementsQuery.error instanceof ApiError && replacementsQuery.error.code === "SHIFT_NOT_OPEN");

  const [inlineError, setInlineError] = useState<string | null>(null);
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.offers(shiftId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.replacements(shiftId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.shift(shiftId) }),
    ]);
  };

  const wave = useMutation({
    mutationFn: () => sendOffers(shiftId),
    onSuccess: async () => {
      setInlineError(null);
      toast.success(t("replacements.offersSent"));
      await invalidate();
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : undefined;
      const message = t(errorMessageKey(code));
      if (code === "NO_CANDIDATES_LEFT") setInlineError(message);
      toast.error(message);
    },
  });

  const contact = useMutation({
    mutationFn: (workerId: number) => sendOffers(shiftId, { workerIds: [workerId] }),
    onSuccess: async () => {
      setInlineError(null);
      toast.success(t("replacements.offersSent"));
      await invalidate();
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : undefined;
      toast.error(t(errorMessageKey(code)));
    },
  });

  const offers = useMemo(() => offersQuery.data?.items ?? [], [offersQuery.data]);
  const announcement = useOfferAnnouncement(offers, replacementsQuery.items);

  const pendingWave = useMemo(() => {
    const waiting = offers.filter((offer) => offer.status === "pending");
    if (waiting.length === 0) return null;
    const waveNumber = Math.max(...waiting.map((offer) => offer.wave));
    return { wave: waveNumber, count: waiting.filter((offer) => offer.wave === waveNumber).length };
  }, [offers]);

  if (!Number.isFinite(shiftId)) return <NotFoundPage />;
  if (shiftQuery.isLoading) return <ListSkeleton />;
  if (shiftQuery.isError) {
    if (shiftQuery.error instanceof ApiError && shiftQuery.error.code === "SHIFT_NOT_FOUND") return <NotFoundPage />;
    return (
      <ErrorState
        message={t(errorMessageKey(shiftQuery.error instanceof ApiError ? shiftQuery.error.code : undefined))}
        onRetry={() => void shiftQuery.refetch()}
      />
    );
  }

  const shift = shiftQuery.data;
  if (!shift) return <NotFoundPage />;
  const replacement =
    shift.firstName && shift.lastName ? `${shift.firstName} ${shift.lastName}` : "";
  const busy = wave.isPending || contact.isPending;

  return (
    <div className="space-y-4">
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
      <div className="sticky top-14 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/" className="text-sm text-slate-500">
              {t("replacements.back")}
            </Link>
            <h1 className="text-2xl font-semibold">{shift.qualification.name}</h1>
          </div>
          {filled ? null : (
            <Button loading={wave.isPending} disabled={busy} onClick={() => wave.mutate()}>
              {t("replacements.sendTop3")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-slate-500">
        <span>{formatDate(shift.startsAt, i18n.language)}</span>
        <ShiftTime start={shift.startsAt} end={shift.endsAt} />
        <Badge tone={shift.status === "open" ? "accent" : "neutral"}>
          {t(`shiftStatus.${shift.status}`)}
        </Badge>
        {absentName ? <span>{t("replacements.absent", { name: absentName })}</span> : null}
      </div>

      {filled ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700" role="status">
          <p className="font-medium">{t("replacements.filledTitle")}</p>
          <p>
            {absentName && replacement
              ? t("replacements.filled", { from: absentName, to: replacement })
              : t("replacements.filledUnknown", { name: replacement || t("shiftStatus.scheduled") })}
          </p>
          <p className="mt-1">{t("replacements.readOnly")}</p>
        </div>
      ) : null}

      {pendingWave ? (
        <p className="text-slate-500" role="status">
          {t("replacements.wave", { wave: pendingWave.wave, count: pendingWave.count })}
        </p>
      ) : null}
      {inlineError ? <p className="text-red-700">{inlineError}</p> : null}

      {replacementsQuery.isLoading ? <ListSkeleton /> : null}
      {replacementsQuery.isError && !filled ? (
        <ErrorState
          message={t(errorMessageKey(replacementsQuery.error instanceof ApiError ? replacementsQuery.error.code : undefined))}
          onRetry={() => void replacementsQuery.refetch()}
        />
      ) : null}
      {!filled && !replacementsQuery.isLoading && !replacementsQuery.isError && replacementsQuery.items.length === 0 ? (
        <EmptyState title={t("replacements.empty")} />
      ) : null}
      {replacementsQuery.items.length > 0 ? (
        <CandidateList
          items={replacementsQuery.items}
          offers={offers}
          filled={filled}
          busy={busy}
          pendingWorkerId={contact.isPending ? contact.variables : null}
          onContact={(workerId) => contact.mutate(workerId)}
        />
      ) : null}

      {shiftOpen ? <ExclusionList shiftId={shiftId} enabled /> : null}
    </div>
  );
}

function useOfferAnnouncement(
  offers: { workerId: number; status: string }[],
  candidates: { workerId: number; firstName: string; lastName: string }[],
): string {
  const { t } = useTranslation();
  const previous = useRef("");
  const [message, setMessage] = useState("");
  const signature = offers.map((offer) => `${offer.workerId}:${offer.status}`).join("|");

  useEffect(() => {
    if (!signature || signature === previous.current) return;
    previous.current = signature;
    const text = offers
      .map((offer) => {
        const person = candidates.find((candidate) => candidate.workerId === offer.workerId);
        const name = person ? `${person.firstName} ${person.lastName}` : String(offer.workerId);
        return `${name} ${t(`offerStatus.${offer.status}`, { defaultValue: t("action.unknown") })}`;
      })
      .join(". ");
    setMessage(text);
  }, [signature, offers, candidates, t]);

  return message;
}
