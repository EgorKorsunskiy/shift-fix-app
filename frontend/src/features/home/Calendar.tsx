import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CalendarShift } from "@/api/types";
import { ApiError } from "@/api/client";
import { errorMessageKey } from "@/api/errors";
import { buttonClass } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { PopoverRoot } from "@/components/ui/Popover";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { ShiftTime } from "@/components/domain/ShiftTime";
import { cn } from "@/lib/cn";
import {
  addCalendarDays,
  brusselsDate,
  brusselsWallTimeToUtc,
  formatDate,
  formatDayLabel,
  rangeForDays,
  visibleDays,
  type CalendarView,
} from "@/lib/dates";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useCalendarShifts } from "./api";

export function Calendar() {
  const { t, i18n } = useTranslation();
  const desktop = useMediaQuery("(min-width: 768px)");
  const view: CalendarView = desktop ? "week" : "day";
  const [anchor, setAnchor] = useState(() => new Date());
  const days = useMemo(() => visibleDays(anchor, view), [anchor, view]);
  const range = useMemo(() => rangeForDays(days), [days]);
  const query = useCalendarShifts(range.from, range.to);
  const events = query.items.filter((shift) => shift.status !== "cancelled");

  function move(direction: -1 | 1) {
    const step = view === "day" ? direction : direction * 7;
    const next = addCalendarDays(brusselsDate(anchor), step);
    setAnchor(brusselsWallTimeToUtc(`${next}T12:00`));
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={() => move(-1)}>
          {t("home.previous")}
        </button>
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={() => setAnchor(new Date())}>
          {t("home.today")}
        </button>
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })} onClick={() => move(1)}>
          {t("home.next")}
        </button>
        <p className="text-slate-500">
          {t("home.weekOf", { date: formatDayLabel(days[0] ?? brusselsDate(anchor), i18n.language) })}
        </p>
      </div>
      {query.isLoading ? <ListSkeleton /> : null}
      {query.isError ? (
        <ErrorState
          message={t(errorMessageKey(query.error instanceof ApiError ? query.error.code : undefined))}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.isError ? (
        <div className={cn("grid gap-3", view === "week" ? "md:grid-cols-7" : "grid-cols-1")}>
          {days.map((day) => {
            const dayEvents = events.filter((shift) => brusselsDate(new Date(shift.startsAt)) === day);
            return (
              <section key={day} className={cn("space-y-2", day === brusselsDate(new Date()) && "rounded-lg")}>
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {formatDayLabel(day, i18n.language)}
                </h2>
                {dayEvents.map((shift) => (
                  <ShiftEvent key={shift.shiftId} shift={shift} />
                ))}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ShiftEvent({ shift }: { shift: CalendarShift }) {
  const { t, i18n } = useTranslation();
  const open = shift.status === "open";
  const label =
    open || !shift.firstName || !shift.lastName ? t("home.open") : `${shift.firstName} ${shift.lastName}`;
  return (
    <PopoverRoot
      trigger={
        <button
          type="button"
          className={cn(
            "w-full rounded-md border px-2 py-2 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
            open ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white",
          )}
        >
          <span className="block text-xs">
            <ShiftTime start={shift.startsAt} end={shift.endsAt} />
          </span>
          <span className="block font-medium">{label}</span>
        </button>
      }
    >
      <div className="space-y-2">
        <p className="font-medium">{label}</p>
        <p className="text-slate-500">{formatDate(shift.startsAt, i18n.language)}</p>
        <p>
          <ShiftTime start={shift.startsAt} end={shift.endsAt} />
        </p>
        {open ? (
          <Link to={`/shifts/${shift.shiftId}/replacements`} className={buttonClass()}>
            {t("home.findReplacement")}
          </Link>
        ) : null}
      </div>
    </PopoverRoot>
  );
}
