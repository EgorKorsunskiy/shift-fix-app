"""What the rule engine and the ranking need to know about each worker, loaded for one shift."""

import sqlite3
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from app.hours import Interval, iso_week_bounds, local_days, year_bounds
from app.timestamps import from_db, to_db

FAIRNESS_WINDOW = timedelta(days=30)


@dataclass(frozen=True)
class Slot:
    """The shift to fill."""
    qualification_id: int
    start: datetime
    end: datetime


@dataclass(frozen=True)
class Preference:
    weekday: int | None  # ISO weekday; None = every day
    start_minute: int    # local wall clock, minutes since midnight
    end_minute: int
    kind: str            # 'prefer' | 'avoid'


@dataclass
class WorkerFacts:
    id: int
    first_name: str
    last_name: str
    contract_type: str
    contract_hours_per_week: float
    hourly_rate_cents: int
    priority_factor: int
    student_hours_external_ytd: float
    qualifications: dict[int, date | None] = field(default_factory=dict)  # qualification_id -> valid_until
    absences: list[Interval] = field(default_factory=list)
    scheduled: list[Interval] = field(default_factory=list)  # scheduled shifts (the plan)
    work: list[Interval] = field(default_factory=list)       # derived worked/planned intervals
    preferences: list[Preference] = field(default_factory=list)
    accepted_offers_30d: int = 0
    has_preferred_channel: bool = False
    offer_status: str | None = None  # this worker's offer for the shift, if any


def _minute_of_day(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def load_facts(conn: sqlite3.Connection, shift: sqlite3.Row, now: datetime,
               margin: timedelta) -> tuple[Slot, list[WorkerFacts]]:
    """Facts about every active worker for `shift`.

    Work intervals are loaded for every local year and ISO week the shift touches, plus
    `margin` on both sides (at least the minimum rest period).
    """
    slot = Slot(shift["qualification_id"], from_db(shift["starts_at"]), from_db(shift["ends_at"]))
    workers = {
        r["id"]: WorkerFacts(
            id=r["id"], first_name=r["first_name"], last_name=r["last_name"], contract_type=r["contract_type"],
            contract_hours_per_week=r["contract_hours_per_week"], hourly_rate_cents=r["hourly_rate_cents"],
            priority_factor=r["priority_factor"], student_hours_external_ytd=r["student_hours_external_ytd"],
        )
        for r in conn.execute("SELECT * FROM worker WHERE is_active = 1")
    }

    def of_active(rows):
        for row in rows:
            if (worker := workers.get(row["worker_id"])) is not None:
                yield worker, row

    days = local_days(slot.start, slot.end)
    periods = [year_bounds(d.year) for d in days] + [iso_week_bounds(d) for d in days]
    window = (to_db(max(p[1] for p in periods) + margin), to_db(min(p[0] for p in periods) - margin))

    rows = conn.execute(
        "SELECT worker_id, valid_until FROM worker_qualification WHERE qualification_id = ?",
        (slot.qualification_id,),
    )
    for w, r in of_active(rows):
        w.qualifications[slot.qualification_id] = date.fromisoformat(r["valid_until"]) if r["valid_until"] else None

    rows = conn.execute(
        "SELECT worker_id, starts_at, ends_at FROM absence WHERE starts_at < ? AND ends_at > ?",
        (shift["ends_at"], shift["starts_at"]),
    )
    for w, r in of_active(rows):
        w.absences.append((from_db(r["starts_at"]), from_db(r["ends_at"])))

    # Derived work intervals: every time entry, plus every scheduled shift that has no time entry
    # (past ones too: a missing time entry must never make someone look less busy).
    with_entries = {r[0] for r in conn.execute("SELECT DISTINCT shift_id FROM time_entry WHERE shift_id IS NOT NULL")}
    rows = conn.execute(
        "SELECT id, worker_id, starts_at, ends_at FROM shift"
        " WHERE status = 'scheduled' AND starts_at < ? AND ends_at > ?",
        window,
    )
    for w, r in of_active(rows):
        interval = (from_db(r["starts_at"]), from_db(r["ends_at"]))
        w.scheduled.append(interval)
        if r["id"] not in with_entries:
            w.work.append(interval)
    rows = conn.execute(
        "SELECT worker_id, started_at, ended_at FROM time_entry WHERE started_at < ? AND ended_at > ?",
        window,
    )
    for w, r in of_active(rows):
        w.work.append((from_db(r["started_at"]), from_db(r["ended_at"])))

    for w, r in of_active(conn.execute("SELECT * FROM worker_preference")):
        w.preferences.append(
            Preference(r["weekday"], _minute_of_day(r["start_time"]), _minute_of_day(r["end_time"]), r["kind"])
        )

    rows = conn.execute(
        "SELECT worker_id, COUNT(*) AS n FROM offer"
        " WHERE status = 'accepted' AND COALESCE(responded_at, sent_at) >= ? GROUP BY worker_id",
        (to_db(now - FAIRNESS_WINDOW),),
    )
    for w, r in of_active(rows):
        w.accepted_offers_30d = r["n"]

    for w, _ in of_active(conn.execute("SELECT DISTINCT worker_id FROM contact_channel WHERE is_preferred = 1")):
        w.has_preferred_channel = True

    for w, r in of_active(conn.execute("SELECT worker_id, status FROM offer WHERE shift_id = ?", (shift["id"],))):
        w.offer_status = r["status"]

    return slot, list(workers.values())
