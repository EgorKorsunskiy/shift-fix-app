import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from app import clock, db, replacements
from app.errors import ApiError
from app.pagination import Cursor, Limit, keyset, offset_page, split_page
from app.schemas import (
    CalendarShift, Candidate, CurrentShift, Exclusion, Offer, Page, QualificationRef, ShiftDetail,
)
from app.timestamps import to_db

router = APIRouter(prefix="/shifts", tags=["shifts"])

Db = Annotated[sqlite3.Connection, Depends(db.get_db)]
ShiftId = Annotated[int, Path(alias="shiftId")]
TIMESTAMP_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$"

SHIFT_WITH_WORKER = """
    SELECT s.id, s.status, s.worker_id, s.qualification_id, s.starts_at, s.ends_at,
           w.first_name, w.last_name, q.code AS q_code, q.name AS q_name
    FROM shift s
    LEFT JOIN worker w ON w.id = s.worker_id
    JOIN qualification q ON q.id = s.qualification_id
"""


def require_shift(conn: sqlite3.Connection, shift_id: int) -> sqlite3.Row:
    row = conn.execute(f"{SHIFT_WITH_WORKER} WHERE s.id = ?", (shift_id,)).fetchone()
    if row is None:
        raise ApiError(404, "SHIFT_NOT_FOUND")
    return row


def require_open_shift(conn: sqlite3.Connection, shift_id: int) -> sqlite3.Row:
    row = require_shift(conn, shift_id)
    if row["status"] != "open":
        raise ApiError(409, "SHIFT_NOT_OPEN")
    return row


def calendar_fields(row: sqlite3.Row) -> dict:
    return {
        "shift_id": row["id"], "status": row["status"], "worker_id": row["worker_id"],
        "first_name": row["first_name"], "last_name": row["last_name"],
        "starts_at": row["starts_at"], "ends_at": row["ends_at"],
    }


@router.get("/current", response_model=Page[CurrentShift])
def current_shifts(conn: Db, limit: Limit = 20, cursor: Cursor = None):
    """Scheduled shifts in progress right now, by the plan."""
    now = to_db(clock.now())
    after, params = keyset(cursor, ["s.ends_at", "s.id"])
    rows = conn.execute(
        f"{SHIFT_WITH_WORKER} WHERE s.status = 'scheduled' AND s.starts_at <= ? AND s.ends_at > ? AND {after}"
        " ORDER BY s.ends_at, s.id LIMIT ?",
        (now, now, *params, limit + 1),
    ).fetchall()
    rows, next_cursor = split_page(rows, limit, lambda r: (r["ends_at"], r["id"]))
    items = [
        CurrentShift(
            shift_id=r["id"], worker_id=r["worker_id"], first_name=r["first_name"], last_name=r["last_name"],
            qualification=QualificationRef(code=r["q_code"], name=r["q_name"]), ends_at=r["ends_at"],
        )
        for r in rows
    ]
    return Page(items=items, next_cursor=next_cursor)


@router.get("", response_model=Page[CalendarShift])
def calendar_shifts(conn: Db,
                    from_: Annotated[str, Query(alias="from", pattern=TIMESTAMP_PATTERN)],
                    to: Annotated[str, Query(pattern=TIMESTAMP_PATTERN)],
                    limit: Limit = 20, cursor: Cursor = None):
    """Shifts overlapping [from, to), any status."""
    if from_ >= to:
        raise ApiError(422, "VALIDATION_ERROR")
    after, params = keyset(cursor, ["s.starts_at", "s.id"])
    rows = conn.execute(
        f"{SHIFT_WITH_WORKER} WHERE s.starts_at < ? AND s.ends_at > ? AND {after}"
        " ORDER BY s.starts_at, s.id LIMIT ?",
        (to, from_, *params, limit + 1),
    ).fetchall()
    rows, next_cursor = split_page(rows, limit, lambda r: (r["starts_at"], r["id"]))
    return Page(items=[CalendarShift(**calendar_fields(r)) for r in rows], next_cursor=next_cursor)


@router.get("/{shiftId}", response_model=ShiftDetail)
def shift_detail(conn: Db, shift_id: ShiftId):
    row = require_shift(conn, shift_id)
    return ShiftDetail(**calendar_fields(row), qualification=QualificationRef(code=row["q_code"], name=row["q_name"]))


@router.get("/{shiftId}/replacements", response_model=Page[Candidate])
def shift_replacements(conn: Db, shift_id: ShiftId, limit: Limit = 20, cursor: Cursor = None):
    """Workers who pass every hard rule, best score first."""
    candidates, _ = replacements.evaluate(conn, require_open_shift(conn, shift_id), clock.now())
    page, next_cursor = offset_page(candidates, limit, cursor)
    items = [
        Candidate(worker_id=c.worker.id, first_name=c.worker.first_name, last_name=c.worker.last_name,
                  score=c.score, offer_status=c.worker.offer_status)
        for c in page
    ]
    return Page(items=items, next_cursor=next_cursor)


@router.get("/{shiftId}/exclusions", response_model=Page[Exclusion])
def shift_exclusions(conn: Db, shift_id: ShiftId, limit: Limit = 20, cursor: Cursor = None):
    """Active workers who fail at least one hard rule, with every rule they fail."""
    _, exclusions = replacements.evaluate(conn, require_open_shift(conn, shift_id), clock.now())
    page, next_cursor = offset_page(exclusions, limit, cursor)
    items = [
        Exclusion(worker_id=e.worker.id, first_name=e.worker.first_name, last_name=e.worker.last_name,
                  failed_rules=e.failed_rules)
        for e in page
    ]
    return Page(items=items, next_cursor=next_cursor)


@router.get("/{shiftId}/offers", response_model=Page[Offer])
def shift_offers(conn: Db, shift_id: ShiftId, limit: Limit = 20, cursor: Cursor = None):
    """Offers for this shift in the order they were sent."""
    require_shift(conn, shift_id)
    after, params = keyset(cursor, ["id"])
    rows = conn.execute(
        f"SELECT id, worker_id, wave, status, sent_at, responded_at FROM offer"
        f" WHERE shift_id = ? AND {after} ORDER BY id LIMIT ?",
        (shift_id, *params, limit + 1),
    ).fetchall()
    rows, next_cursor = split_page(rows, limit, lambda r: (r["id"],))
    items = [
        Offer(offer_id=r["id"], worker_id=r["worker_id"], wave=r["wave"], status=r["status"],
              sent_at=r["sent_at"], responded_at=r["responded_at"])
        for r in rows
    ]
    return Page(items=items, next_cursor=next_cursor)
