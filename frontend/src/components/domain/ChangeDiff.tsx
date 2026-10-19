import { useTranslation } from "react-i18next";
import type { HistoryEntry } from "@/api/types";
import { formatDateTime, formatIsoDate } from "@/lib/dates";
import { formatEur } from "@/lib/money";

export function ChangeDiff({ changes }: { changes: HistoryEntry["changes"] }) {
  const { t, i18n } = useTranslation();
  if (!changes || changes.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {changes.map((change) => (
        <li key={change.field} className="text-slate-500">
          <span className="text-slate-700">{fieldLabel(change.field, t)}</span>{" "}
          {formatChangeValue(change.field, change.from, i18n.language, t)}
          <span aria-hidden> → </span>
          {formatChangeValue(change.field, change.to, i18n.language, t)}
        </li>
      ))}
    </ul>
  );
}

function fieldLabel(field: string, t: (key: string, options?: { defaultValue?: string }) => string) {
  return t(`fields.${field}`, { defaultValue: t("fields.unknown") });
}

export function formatChangeValue(
  field: string,
  value: unknown,
  language: string,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "hourlyRateCents" && typeof value === "number") return formatEur(value, language);
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  if (field === "contractType" && typeof value === "string") {
    return t(`contract.${value}`, { defaultValue: value });
  }
  if (field === "language" && typeof value === "string") {
    return t(`language.${value}`, { defaultValue: value });
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatIsoDate(value, language);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(value)) {
    return formatDateTime(value, language);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "code" in item) return String(item.code);
        return String(item);
      })
      .join(", ");
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "—";
}

export function formatActor(
  actor: string,
  t: (key: string, options?: Record<string, string>) => string,
): string {
  if (actor === "manager" || actor === "system" || actor === "bot") return t(`actor.${actor}`);
  const match = /^worker:(\d+)$/.exec(actor);
  if (match?.[1]) return t("actor.worker", { id: match[1] });
  return t("actor.system");
}
