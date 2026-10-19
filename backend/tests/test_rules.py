"""Hard rules, end to end from the database. Each limit is tested exactly at the boundary
and one minute (or one hour) past it.

The shift to fill is Tuesday 2026-10-20 07:00-15:00 UTC = 09:00-17:00 in Brussels (8h).
Its local ISO week runs from 2026-10-18T22:00Z to 2026-10-25T23:00Z.
"""

import json
import re
from pathlib import Path

import pytest

from app import clock
from app.replacements import evaluate
from app.rules import RULES, load_rules
from tests.factories import (
    add_absence, add_qualification, add_shift, add_time_entry, add_worker, grant,
)

DOMAIN_MD = Path(__file__).resolve().parents[2] / "docs" / "backend" / "domain.md"


@pytest.fixture
def bakery(conn):
    return add_qualification(conn, "bakery", "Bakery")


@pytest.fixture
def shift(conn, bakery):
    return add_shift(conn, bakery, None, "2026-10-20T07:00Z", "2026-10-20T15:00Z")


def failed(conn, shift_id: int, worker_id: int) -> list[str]:
    row = conn.execute("SELECT * FROM shift WHERE id = ?", (shift_id,)).fetchone()
    candidates, exclusions = evaluate(conn, row, clock.now())
    for e in exclusions:
        if e.worker.id == worker_id:
            return e.failed_rules
    assert worker_id in [c.worker.id for c in candidates]
    return []


def qualified(conn, bakery, **overrides) -> int:
    worker = add_worker(conn, **overrides)
    grant(conn, worker, bakery)
    return worker


def scheduled(conn, qualification, worker, *intervals):
    for start, end in intervals:
        add_shift(conn, qualification, worker, start, end)


# Four 8h shifts later in the week, each well over 11h apart: 32h.
LATER_THIS_WEEK = [(f"2026-10-{d}T06:00Z", f"2026-10-{d}T14:00Z") for d in (21, 22, 23, 24)]


def test_rules_json_matches_domain_md():
    md_rules = json.loads(re.search(r"```json\n(.*?)```", DOMAIN_MD.read_text(), re.S).group(1))

    assert json.loads((Path(__file__).parents[1] / "app" / "rules.json").read_text()) == md_rules
    assert load_rules().timezone == clock.LOCAL_TZ.key


def test_rule_ids_match_the_api():
    assert list(RULES) == ["qualification", "availability", "no_overlap", "min_rest",
                           "max_daily", "max_weekly", "student_quota"]


def test_fully_eligible_worker(conn, bakery, shift):
    assert failed(conn, shift, qualified(conn, bakery)) == []


# --- qualification ---------------------------------------------------------------

def test_qualification_missing(conn, shift):
    assert failed(conn, shift, add_worker(conn)) == ["qualification"]


@pytest.mark.parametrize("valid_until, expected", [
    ("2026-10-19", ["qualification"]),  # expired the day before
    ("2026-10-20", []),                 # still valid on the shift's day
    (None, []),                         # never expires
])
def test_qualification_expiry(conn, bakery, shift, valid_until, expected):
    worker = add_worker(conn)
    grant(conn, worker, bakery, valid_until=valid_until)

    assert failed(conn, shift, worker) == expected


def test_qualification_must_cover_the_local_day_a_night_shift_ends(conn, bakery):
    night = add_shift(conn, bakery, None, "2026-10-20T20:00Z", "2026-10-21T04:00Z")  # 22:00-06:00 local
    worker = add_worker(conn)
    grant(conn, worker, bakery, valid_until="2026-10-20")

    assert failed(conn, night, worker) == ["qualification"]


# --- availability ----------------------------------------------------------------

def test_absent_worker_is_excluded(conn, bakery, shift):
    worker = qualified(conn, bakery)
    add_absence(conn, worker, "2026-10-20T05:00Z", "2026-10-20T22:00Z")

    assert failed(conn, shift, worker) == ["availability"]


def test_absence_ending_when_the_shift_starts_is_fine(conn, bakery, shift):
    worker = qualified(conn, bakery)
    add_absence(conn, worker, "2026-10-19T07:00Z", "2026-10-20T07:00Z", type="vacation")

    assert failed(conn, shift, worker) == []


# --- no_overlap ------------------------------------------------------------------

def test_overlapping_scheduled_shift(conn, bakery, shift):
    worker = qualified(conn, bakery)
    scheduled(conn, bakery, worker, ("2026-10-20T13:00Z", "2026-10-20T20:00Z"))

    assert "no_overlap" in failed(conn, shift, worker)


def test_cancelled_shift_does_not_count(conn, bakery, shift):
    worker = qualified(conn, bakery)
    add_shift(conn, bakery, worker, "2026-10-20T07:00Z", "2026-10-20T15:00Z", status="cancelled")

    assert failed(conn, shift, worker) == []


# --- min_rest (11h) --------------------------------------------------------------

@pytest.mark.parametrize("previous_end, expected", [
    ("2026-10-19T20:00Z", []),            # exactly 11h before 07:00Z
    ("2026-10-19T20:01Z", ["min_rest"]),  # 10h59m
])
def test_min_rest_before(conn, bakery, shift, previous_end, expected):
    worker = qualified(conn, bakery)
    scheduled(conn, bakery, worker, ("2026-10-19T14:00Z", previous_end))

    assert failed(conn, shift, worker) == expected


@pytest.mark.parametrize("next_start, expected", [
    ("2026-10-21T02:00Z", []),            # exactly 11h after 15:00Z
    ("2026-10-21T01:59Z", ["min_rest"]),
])
def test_min_rest_after(conn, bakery, shift, next_start, expected):
    worker = qualified(conn, bakery)
    scheduled(conn, bakery, worker, (next_start, "2026-10-21T08:00Z"))

    assert failed(conn, shift, worker) == expected


def test_min_rest_also_counts_time_entries(conn, bakery, shift):
    worker = qualified(conn, bakery)
    add_time_entry(conn, worker, "2026-10-19T15:00Z", "2026-10-19T23:00Z")  # ad-hoc work, 8h before

    assert failed(conn, shift, worker) == ["min_rest"]


# --- max_daily (9h per local day) ------------------------------------------------

@pytest.mark.parametrize("end, expected", [
    ("2026-10-20T16:00Z", []),             # 9h
    ("2026-10-20T16:01Z", ["max_daily"]),  # 9h01
])
def test_max_daily(conn, bakery, end, expected):
    long_shift = add_shift(conn, bakery, None, "2026-10-20T07:00Z", end)

    assert failed(conn, long_shift, qualified(conn, bakery)) == expected


def test_max_daily_splits_a_night_shift_at_local_midnight(conn, bakery):
    night = add_shift(conn, bakery, None, "2026-10-20T17:00Z", "2026-10-21T03:00Z")  # 19:00-05:00 local, 5h + 5h

    assert failed(conn, night, qualified(conn, bakery)) == []


# --- max_weekly ------------------------------------------------------------------

@pytest.mark.parametrize("contract_type, contract_hours, later, expected", [
    ("full_time", 38, LATER_THIS_WEEK, []),                                        # 32 + 8 = 40
    ("full_time", 38, LATER_THIS_WEEK[:3] + [("2026-10-24T06:00Z", "2026-10-24T15:00Z")], ["max_weekly"]),  # 41
    ("part_time", 20, LATER_THIS_WEEK[:2], []),                                    # 16 + 8 = 24 = 20 + 4
    ("part_time", 20, LATER_THIS_WEEK[:1] + [("2026-10-22T06:00Z", "2026-10-22T15:00Z")], ["max_weekly"]),  # 25
    ("student", 20, [("2026-10-21T06:00Z", "2026-10-21T12:00Z"), ("2026-10-22T06:00Z", "2026-10-22T12:00Z")], []),  # 20
    ("student", 20, [("2026-10-21T06:00Z", "2026-10-21T12:00Z"), ("2026-10-22T06:00Z", "2026-10-22T13:00Z")],
     ["max_weekly"]),                                                              # 21
])
def test_max_weekly_by_contract_type(conn, bakery, shift, contract_type, contract_hours, later, expected):
    worker = qualified(conn, bakery, contract_type=contract_type, contract_hours_per_week=contract_hours)
    scheduled(conn, bakery, worker, *later)

    assert failed(conn, shift, worker) == expected


@pytest.mark.parametrize("last_shift_end, expected", [
    ("2026-10-25T14:00Z", []),              # 40 + 8 = 48
    ("2026-10-25T15:00Z", ["max_weekly"]),  # 49
])
def test_absolute_weekly_cap(conn, bakery, shift, last_shift_end, expected):
    # A part-timer with 46 contract hours would be allowed 50; the absolute cap is 48.
    worker = qualified(conn, bakery, contract_type="part_time", contract_hours_per_week=46)
    scheduled(conn, bakery, worker, *LATER_THIS_WEEK, ("2026-10-25T06:00Z", last_shift_end))

    assert failed(conn, shift, worker) == expected


def test_shift_with_time_entry_is_counted_once(conn, bakery, shift):
    worker = qualified(conn, bakery, contract_type="full_time", contract_hours_per_week=38)
    past = add_shift(conn, bakery, worker, "2026-10-19T06:00Z", "2026-10-19T14:00Z")
    conn.execute("INSERT INTO time_entry (worker_id, shift_id, started_at, ended_at) VALUES (?, ?, ?, ?)",
                 (worker, past, "2026-10-19T06:00Z", "2026-10-19T14:00Z"))
    scheduled(conn, bakery, worker, *LATER_THIS_WEEK[:3])

    assert failed(conn, shift, worker) == []  # 8 + 24 + 8 = 40, not 48


def test_past_scheduled_shift_without_time_entry_still_counts(conn, bakery, shift):
    worker = qualified(conn, bakery, contract_type="full_time", contract_hours_per_week=38)
    scheduled(conn, bakery, worker, ("2026-10-19T06:00Z", "2026-10-19T14:00Z"), *LATER_THIS_WEEK[:3],
              ("2026-10-24T06:00Z", "2026-10-24T07:00Z"))

    assert failed(conn, shift, worker) == ["max_weekly"]  # 8 + 24 + 1 + 8 = 41


# --- student_quota (650h per calendar year, all employers) -------------------------

@pytest.mark.parametrize("external, expected", [
    (600, []),                  # 600 + 42 + 8 = 650
    (601, ["student_quota"]),   # 651
])
def test_student_quota(conn, bakery, shift, external, expected):
    worker = qualified(conn, bakery, contract_type="student", student_hours_external_ytd=external)
    add_time_entry(conn, worker, "2026-09-01T00:00Z", "2026-09-02T18:00Z")  # 42h here this year

    assert failed(conn, shift, worker) == expected


def test_student_quota_ignores_non_students(conn, bakery, shift):
    worker = qualified(conn, bakery, contract_type="part_time")
    add_time_entry(conn, worker, "2026-01-01T00:00Z", "2026-02-01T00:00Z")  # 744h this year

    assert failed(conn, shift, worker) == []


# --- reporting ---------------------------------------------------------------------

def test_every_failed_rule_is_reported(conn, shift):
    worker = add_worker(conn)
    add_absence(conn, worker, "2026-10-20T05:00Z", "2026-10-20T22:00Z")

    assert failed(conn, shift, worker) == ["qualification", "availability"]


def test_inactive_workers_are_in_neither_list(conn, bakery, shift):
    inactive = qualified(conn, bakery, is_active=0)
    row = conn.execute("SELECT * FROM shift WHERE id = ?", (shift,)).fetchone()

    candidates, exclusions = evaluate(conn, row, clock.now())

    assert inactive not in [c.worker.id for c in candidates] + [e.worker.id for e in exclusions]
