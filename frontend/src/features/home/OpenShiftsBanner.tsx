import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buttonClass } from "@/components/ui/Button";
import { useTodayShifts } from "./api";

export function OpenShiftsBanner() {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  const query = useTodayShifts();
  const open = query.items.filter((shift) => shift.status === "open");
  if (open.length === 0) return null;

  const label = open.length === 1 ? t("home.openShifts_one") : t("home.openShifts", { count: open.length });
  const only = open[0];

  if (open.length === 1 && only) {
    return (
      <Link
        to={`/shifts/${only.shiftId}/replacements`}
        className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-700"
      >
        <span>{label}</span>
        <span className="font-medium">{t("home.findReplacement")}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass({
        variant: "secondary",
        className: "w-full justify-between border-indigo-200 bg-indigo-50 text-indigo-700",
      })}
      onClick={() => setParams({ tab: "calendar" })}
    >
      <span>{label}</span>
      <span>{t("home.findReplacement")}</span>
    </button>
  );
}
