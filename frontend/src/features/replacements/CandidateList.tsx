import { useTranslation } from "react-i18next";
import type { Candidate, Offer } from "@/api/types";
import { OfferStatusBadge } from "@/components/domain/OfferStatusBadge";
import { WorkerName } from "@/components/domain/WorkerName";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatRelative } from "@/lib/relative";
import { ContactButton } from "./ContactButton";

export function CandidateList({
  items,
  offers,
  filled,
  busy,
  pendingWorkerId,
  onContact,
}: {
  items: Candidate[];
  offers: Offer[];
  filled: boolean;
  busy: boolean;
  pendingWorkerId: number | null;
  onContact: (workerId: number) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {items.map((candidate) => {
        const offer = offers.find((item) => item.workerId === candidate.workerId);
        const status = offer?.status ?? candidate.offerStatus;
        const hideContact = filled || status === "pending" || status === "accepted";
        return (
          <li
            key={candidate.workerId}
            data-testid="candidate-row"
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar first={candidate.firstName} last={candidate.lastName} />
              <div className="min-w-0 flex-1 space-y-1">
                <WorkerName first={candidate.firstName} last={candidate.lastName} />
                <ScoreBar score={candidate.score} />
                <div className="flex flex-wrap items-center gap-2">
                  {status ? <OfferStatusBadge status={status} /> : null}
                  {offer ? (
                    <span className="text-xs text-slate-500">
                      {t("replacements.sent", {
                        time: formatRelative(offer.sentAt, i18n.language),
                      })}
                      {offer.respondedAt
                        ? ` · ${t("replacements.replied", { time: formatRelative(offer.respondedAt, i18n.language) })}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hideContact ? null : (
                <Button
                  variant="secondary"
                  loading={busy && pendingWorkerId === candidate.workerId}
                  disabled={busy}
                  onClick={() => onContact(candidate.workerId)}
                >
                  {t("replacements.contact")}
                </Button>
              )}
              <ContactButton workerId={candidate.workerId} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
