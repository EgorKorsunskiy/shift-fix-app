import { useTranslation } from "react-i18next";
import type { OfferStatus } from "@/api/types";
import { Badge } from "@/components/ui/Badge";

const tone = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  expired: "neutral",
  cancelled: "neutral",
} as const;

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const { t } = useTranslation();
  return <Badge tone={tone[status]}>{t(`offerStatus.${status}`)}</Badge>;
}
