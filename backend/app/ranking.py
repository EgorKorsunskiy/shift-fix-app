"""Soft ranking of eligible candidates (docs/backend/domain.md → Ranking).

Each component is in [0, 1]; the score is their weighted sum, an integer 0..100.
Ranking never filters anyone out; that is the hard rules' job.
"""

import math
from datetime import datetime

from app.clock import LOCAL_TZ
from app.facts import Slot, WorkerFacts
from app.hours import day_bounds, local_days, overlap_minutes, week_bounds

WEIGHTS = {  # points out of 100
    "priority": 40,
    "contract_hours": 20,
    "cost": 15,
    "preferences": 15,
    "fairness": 10,
}


def priority(w: WorkerFacts) -> float:
    return min(max(w.priority_factor, 0), 3) / 3


def contract_hours(slot: Slot, w: WorkerFacts) -> float:
    """Share of the shift that still fits in the worker's contract hours for that week."""
    used = overlap_minutes(w.work, *week_bounds(slot.start))
    remaining = w.contract_hours_per_week * 60 - used
    shift_minutes = (slot.end - slot.start).total_seconds() / 60
    return min(max(remaining / shift_minutes, 0.0), 1.0)


def cost(w: WorkerFacts, rates: list[int]) -> float:
    """1 for the cheapest eligible candidate, 0 for the most expensive."""
    low, high = min(rates), max(rates)
    return 1.0 if high == low else (high - w.hourly_rate_cents) / (high - low)


def _minute_of_day(dt: datetime) -> int:
    local = dt.astimezone(LOCAL_TZ)
    return local.hour * 60 + local.minute


def preferences(slot: Slot, w: WorkerFacts) -> float:
    """0 if the shift touches an 'avoid' window, 1 if it lies fully inside 'prefer' windows,
    0.75 if it only partly overlaps them, 0.5 if no window applies."""
    touches_prefer = touches_avoid = False
    fully_preferred = True
    for day in local_days(slot.start, slot.end):
        day_start, day_end = day_bounds(day)
        start = _minute_of_day(max(slot.start, day_start))
        end = 24 * 60 if slot.end >= day_end else _minute_of_day(slot.end)
        inside = False
        for p in w.preferences:
            if p.weekday not in (None, day.isoweekday()) or not (start < p.end_minute and p.start_minute < end):
                continue
            if p.kind == "avoid":
                touches_avoid = True
            else:
                touches_prefer = True
                inside = inside or (p.start_minute <= start and end <= p.end_minute)
        fully_preferred = fully_preferred and inside
    if touches_avoid:
        return 0.0
    if fully_preferred:
        return 1.0
    return 0.75 if touches_prefer else 0.5


def fairness(w: WorkerFacts) -> float:
    """Fewer accepted offers in the last 30 days ranks higher."""
    return 1 / (1 + w.accepted_offers_30d)


def score(slot: Slot, w: WorkerFacts, rates: list[int]) -> int:
    components = {
        "priority": priority(w),
        "contract_hours": contract_hours(slot, w),
        "cost": cost(w, rates),
        "preferences": preferences(slot, w),
        "fairness": fairness(w),
    }
    points = sum(WEIGHTS[name] * value for name, value in components.items())
    # Round half up (built-in round() rounds half to even); the epsilon absorbs float noise like 92.4999...
    return math.floor(points + 0.5 + 1e-9)
