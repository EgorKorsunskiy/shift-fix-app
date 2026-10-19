import pytest

from app import ranking
from app.facts import Preference, Slot, WorkerFacts
from app.timestamps import from_db

# Tuesday 2026-10-20 09:00-17:00 in Brussels.
SLOT = Slot(qualification_id=1, start=from_db("2026-10-20T07:00Z"), end=from_db("2026-10-20T15:00Z"))


def worker(**overrides) -> WorkerFacts:
    return WorkerFacts(**{
        "id": 1, "first_name": "Anna", "last_name": "Peeters", "contract_type": "part_time",
        "contract_hours_per_week": 20, "hourly_rate_cents": 1500, "priority_factor": 0,
        "student_hours_external_ytd": 0,
    } | overrides)


def minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def pref(start: str, end: str, kind: str = "prefer", weekday: int | None = None) -> Preference:
    return Preference(weekday, minutes(start), minutes(end), kind)


def test_weights_sum_to_100():
    assert sum(ranking.WEIGHTS.values()) == 100


@pytest.mark.parametrize("factor, expected", [(0, 0), (1, 1 / 3), (3, 1)])
def test_priority(factor, expected):
    assert ranking.priority(worker(priority_factor=factor)) == pytest.approx(expected)


def test_contract_hours_is_the_share_of_the_shift_within_contract_hours():
    used_16h = [(from_db("2026-10-19T06:00Z"), from_db("2026-10-19T22:00Z"))]

    assert ranking.contract_hours(SLOT, worker()) == 1
    assert ranking.contract_hours(SLOT, worker(work=used_16h)) == 0.5  # 4h left of 20 for an 8h shift
    assert ranking.contract_hours(SLOT, worker(contract_hours_per_week=10, work=used_16h)) == 0


def test_cost_is_relative_to_eligible_candidates():
    rates = [1200, 1500, 1800]

    assert ranking.cost(worker(hourly_rate_cents=1200), rates) == 1
    assert ranking.cost(worker(hourly_rate_cents=1500), rates) == 0.5
    assert ranking.cost(worker(hourly_rate_cents=1800), rates) == 0
    assert ranking.cost(worker(), [1500]) == 1


@pytest.mark.parametrize("preferences, expected", [
    ([], 0.5),
    ([pref("08:00", "18:00")], 1.0),                     # fully inside
    ([pref("08:00", "12:00")], 0.75),                    # partly
    ([pref("08:00", "18:00", weekday=3)], 0.5),          # Wednesdays only; the shift is on a Tuesday
    ([pref("08:00", "18:00", weekday=2)], 1.0),          # Tuesdays
    ([pref("08:00", "18:00"), pref("16:00", "20:00", "avoid")], 0.0),  # avoid wins
    ([pref("17:00", "20:00", "avoid")], 0.5),            # touches only at the end boundary
])
def test_preferences(preferences, expected):
    assert ranking.preferences(SLOT, worker(preferences=preferences)) == expected


def test_preferences_for_a_night_shift_need_both_local_days_covered():
    night = Slot(1, from_db("2026-10-20T20:00Z"), from_db("2026-10-21T04:00Z"))  # 22:00-06:00 local

    assert ranking.preferences(night, worker(preferences=[pref("20:00", "24:00")])) == 0.75
    assert ranking.preferences(night, worker(preferences=[pref("20:00", "24:00"), pref("00:00", "07:00")])) == 1.0


@pytest.mark.parametrize("accepted, expected", [(0, 1), (1, 0.5), (3, 0.25)])
def test_fairness(accepted, expected):
    assert ranking.fairness(worker(accepted_offers_30d=accepted)) == expected


def test_score_applies_the_weights():
    best = worker(priority_factor=3, preferences=[pref("08:00", "18:00")])
    no_priority = worker(priority_factor=0, preferences=[pref("08:00", "18:00")])

    assert ranking.score(SLOT, best, [1500]) == 100
    assert ranking.score(SLOT, no_priority, [1500]) == 60
    assert ranking.score(SLOT, worker(priority_factor=3), [1500]) == 93  # 92.5 with neutral preferences, half up
