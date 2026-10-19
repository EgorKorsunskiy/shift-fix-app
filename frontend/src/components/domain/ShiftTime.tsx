import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/dates";

export function ShiftTime({ start, end }: { start: string; end: string }) {
  const { i18n } = useTranslation();
  return (
    <span className="tabular-nums text-slate-500">
      {formatTime(start, i18n.language)}–{formatTime(end, i18n.language)}
    </span>
  );
}
