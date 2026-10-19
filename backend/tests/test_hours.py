from datetime import datetime, timezone

from app.hours import week_bounds, worked_hours
from app.timestamps import from_db, to_db
from tests.factories import add_time_entry, add_worker


def test_week_bounds_are_local_monday_midnights():
    start, end = week_bounds(from_db("2026-10-20T07:00Z"))

    # Mon 19 Oct 00:00 CEST (UTC+2) .. Mon 26 Oct 00:00 CET (UTC+1): the week of the DST change.
    assert (to_db(start), to_db(end)) == ("2026-10-18T22:00Z", "2026-10-25T23:00Z")
    assert (end - start).total_seconds() / 3600 == 169


def test_week_bounds_on_local_monday_just_after_midnight():
    # 2026-10-18T22:30Z is already Monday 00:30 in Brussels.
    start, _ = week_bounds(datetime(2026, 10, 18, 22, 30, tzinfo=timezone.utc))

    assert to_db(start) == "2026-10-18T22:00Z"


def test_worked_hours_clips_entries_to_the_window(conn):
    worker = add_worker(conn)
    start, end = from_db("2026-10-18T22:00Z"), from_db("2026-10-25T23:00Z")
    add_time_entry(conn, worker, "2026-10-18T20:00Z", "2026-10-19T02:00Z")  # 4h inside
    add_time_entry(conn, worker, "2026-10-20T07:00Z", "2026-10-20T15:30Z")  # 8.5h inside
    add_time_entry(conn, worker, "2026-10-26T07:00Z", "2026-10-26T15:00Z")  # next week
    add_time_entry(conn, add_worker(conn), "2026-10-20T07:00Z", "2026-10-20T15:00Z")  # someone else

    assert worked_hours(conn, worker, start, end) == 12.5


def test_worked_hours_counts_the_extra_hour_of_the_dst_week(conn):
    worker = add_worker(conn)
    start, end = week_bounds(from_db("2026-10-20T07:00Z"))
    add_time_entry(conn, worker, "2026-10-18T00:00Z", "2026-10-27T00:00Z")  # covers the whole week

    assert worked_hours(conn, worker, start, end) == 169
