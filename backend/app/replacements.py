"""Replacement candidates for an open shift: hard rules filter first, then ranking orders."""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.facts import WorkerFacts, load_facts
from app.ranking import score
from app.rules import failed_rules, load_rules


@dataclass(frozen=True)
class Candidate:
    worker: WorkerFacts
    score: int


@dataclass(frozen=True)
class Exclusion:
    worker: WorkerFacts
    failed_rules: list[str]


def evaluate(conn: sqlite3.Connection, shift: sqlite3.Row, now: datetime) -> tuple[list[Candidate], list[Exclusion]]:
    """Every active worker ends up in exactly one of the two lists.

    Candidates: best score first; ties go to workers reachable on a preferred channel, then by name.
    Exclusions: by name.
    """
    cfg = load_rules()
    margin = timedelta(hours=cfg.min_rest_hours) + timedelta(days=1)
    slot, workers = load_facts(conn, shift, now, margin)

    eligible, exclusions = [], []
    for w in workers:
        failed = failed_rules(slot, w, now, cfg)
        if failed:
            exclusions.append(Exclusion(w, failed))
        else:
            eligible.append(w)

    rates = [w.hourly_rate_cents for w in eligible]
    candidates = [Candidate(w, score(slot, w, rates)) for w in eligible]
    candidates.sort(key=lambda c: (-c.score, not c.worker.has_preferred_channel,
                                   c.worker.last_name, c.worker.first_name, c.worker.id))
    exclusions.sort(key=lambda e: (e.worker.last_name, e.worker.first_name, e.worker.id))
    return candidates, exclusions
