import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/Badge";

const KNOWN = new Set([
  "qualification",
  "availability",
  "no_overlap",
  "min_rest",
  "max_daily",
  "max_weekly",
  "student_quota",
]);

export function RuleBadge({ rule }: { rule: string }) {
  const { t } = useTranslation();
  const known = KNOWN.has(rule);
  return <Badge tone="neutral">{t(known ? `rules.${rule}` : "rules.unknown")}</Badge>;
}
