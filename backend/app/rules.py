"""Hard labour rules (docs/backend/domain.md → Hard rules). Pure functions, no DB access.

A worker is eligible only if every rule passes. Every rule is evaluated, so an exclusion
lists all the rules a worker fails. Limits are inclusive: reaching a cap exactly is
allowed, going one minute over is not. A shift that crosses midnight, a week or a year
is checked against every local day, ISO week and year it touches.
"""

import json
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import cache
from pathlib import Path

from app.clock import LOCAL_TZ
from app.facts import Slot, WorkerFacts
from app.hours import Interval, day_bounds, iso_week_bounds, local_days, overlap_minutes, year_bounds

RULES_PATH = Path(__file__).with_name("rules.json")


@dataclass(frozen=True)
class RulesConfig:
    version: str
    timezone: str
    min_rest_hours: float
    max_daily_hours: float
    weekly_max_hours: dict[str, float]
    part_time_max_over_contract_hours: float
    absolute_weekly_max_hours: float
    student_yearly_quota_hours: float


@cache
def load_rules() -> RulesConfig:
    return RulesConfig(**json.loads(RULES_PATH.read_text()))


def _overlaps(interval: Interval, start: datetime, end: datetime) -> bool:
    return interval[0] < end and interval[1] > start


def _work_with_slot(slot: Slot, w: WorkerFacts) -> list[Interval]:
    return [*w.work, (slot.start, slot.end)]


def qualification(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    """Holds the shift's qualification, still valid on the local day the shift ends."""
    if slot.qualification_id not in w.qualifications:
        return False
    valid_until = w.qualifications[slot.qualification_id]
    return valid_until is None or valid_until >= local_days(slot.start, slot.end)[-1]


def availability(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    return not any(_overlaps(a, slot.start, slot.end) for a in w.absences)


def no_overlap(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    return not any(_overlaps(s, slot.start, slot.end) for s in w.scheduled)


def min_rest(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    """No work within min_rest_hours before the shift starts or after it ends."""
    rest = timedelta(hours=cfg.min_rest_hours)
    return not any(_overlaps(i, slot.start - rest, slot.end + rest) for i in w.work)


def max_daily(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    work = _work_with_slot(slot, w)
    return all(
        overlap_minutes(work, *day_bounds(day)) <= cfg.max_daily_hours * 60
        for day in local_days(slot.start, slot.end)
    )


def weekly_limit_hours(w: WorkerFacts, cfg: RulesConfig) -> float:
    if w.contract_type == "part_time":
        limit = w.contract_hours_per_week + cfg.part_time_max_over_contract_hours
    else:
        limit = cfg.weekly_max_hours[w.contract_type]
    return min(limit, cfg.absolute_weekly_max_hours)


def max_weekly(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    work = _work_with_slot(slot, w)
    weeks = {iso_week_bounds(day) for day in local_days(slot.start, slot.end)}
    return all(overlap_minutes(work, *week) <= weekly_limit_hours(w, cfg) * 60 for week in weeks)


def student_quota(slot: Slot, w: WorkerFacts, cfg: RulesConfig, now: datetime) -> bool:
    """Students: hours at other employers this year + hours here + the shift ≤ the yearly quota."""
    if w.contract_type != "student":
        return True
    work = _work_with_slot(slot, w)
    current_year = now.astimezone(LOCAL_TZ).year
    for year in {day.year for day in local_days(slot.start, slot.end)}:
        external = w.student_hours_external_ytd if year == current_year else 0
        if external * 60 + overlap_minutes(work, *year_bounds(year)) > cfg.student_yearly_quota_hours * 60:
            return False
    return True


Rule = Callable[[Slot, WorkerFacts, RulesConfig, datetime], bool]

RULES: dict[str, Rule] = {
    "qualification": qualification,
    "availability": availability,
    "no_overlap": no_overlap,
    "min_rest": min_rest,
    "max_daily": max_daily,
    "max_weekly": max_weekly,
    "student_quota": student_quota,
}


def failed_rules(slot: Slot, w: WorkerFacts, now: datetime, cfg: RulesConfig | None = None) -> list[str]:
    cfg = cfg or load_rules()
    return [rule_id for rule_id, check in RULES.items() if not check(slot, w, cfg, now)]
