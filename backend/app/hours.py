"""Local calendar periods and derived working hours (docs/backend/domain.md → Derived values).

All returned bounds are UTC on purpose: subtracting two datetimes that share a ZoneInfo
ignores DST changes, so every hour calculation happens in UTC.
"""

import sqlite3
from collections.abc import Iterable
from datetime import date, datetime, time, timedelta, timezone

from app.clock import LOCAL_TZ
from app.timestamps import from_db, to_db

Interval = tuple[datetime, datetime]  # UTC, [start, end)


def local_midnight(day: date) -> datetime:
    return datetime.combine(day, time(), LOCAL_TZ).astimezone(timezone.utc)


def day_bounds(day: date) -> Interval:
    return local_midnight(day), local_midnight(day + timedelta(days=1))


def iso_week_bounds(day: date) -> Interval:
    """Monday 00:00 to next Monday 00:00 (local) of the ISO week containing `day`."""
    monday = day - timedelta(days=day.weekday())
    return local_midnight(monday), local_midnight(monday + timedelta(days=7))


def year_bounds(year: int) -> Interval:
    return local_midnight(date(year, 1, 1)), local_midnight(date(year + 1, 1, 1))


def week_bounds(at: datetime) -> Interval:
    return iso_week_bounds(at.astimezone(LOCAL_TZ).date())


def local_days(start: datetime, end: datetime) -> list[date]:
    """Local dates touched by [start, end)."""
    first = start.astimezone(LOCAL_TZ).date()
    last = (end - timedelta(minutes=1)).astimezone(LOCAL_TZ).date()
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def overlap_minutes(intervals: Iterable[Interval], start: datetime, end: datetime) -> int:
    """Total minutes of `intervals` inside [start, end)."""
    return sum(
        max(0, int((min(e, end) - max(s, start)).total_seconds()) // 60)
        for s, e in intervals
    )


def worked_hours(conn: sqlite3.Connection, worker_id: int, start: datetime, end: datetime) -> float:
    """Actual hours from time entries, clipped to [start, end)."""
    rows = conn.execute(
        "SELECT started_at, ended_at FROM time_entry"
        " WHERE worker_id = ? AND started_at < ? AND ended_at > ?",
        (worker_id, to_db(end), to_db(start)),
    )
    entries = [(from_db(r["started_at"]), from_db(r["ended_at"])) for r in rows]
    return round(overlap_minutes(entries, start, end) / 60, 2)
