import json
import sqlite3
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app import clock, db
from app.errors import ApiError
from app.hours import week_bounds, worked_hours
from app.pagination import Cursor, Limit, keyset, split_page
from app.schemas import (
    Change, ContactChannel, ContactInfo, HistoryEntry, Page, QualificationRef, WorkerDetail,
    WorkerQualification, WorkerRow,
)

router = APIRouter(prefix="/workers", tags=["workers"])

Db = Annotated[sqlite3.Connection, Depends(db.get_db)]
WorkerId = Annotated[int, Path(alias="workerId")]


def require_worker(conn: sqlite3.Connection, worker_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM worker WHERE id = ?", (worker_id,)).fetchone()
    if row is None:
        raise ApiError(404, "WORKER_NOT_FOUND")
    return row


def qualifications_by_worker(conn: sqlite3.Connection, worker_ids: list[int]) -> dict[int, list[sqlite3.Row]]:
    rows = conn.execute(
        "SELECT wq.worker_id, wq.valid_until, q.code, q.name FROM worker_qualification wq"
        " JOIN qualification q ON q.id = wq.qualification_id"
        f" WHERE wq.worker_id IN ({', '.join('?' * len(worker_ids))}) ORDER BY q.name",
        worker_ids,
    )
    grouped = defaultdict(list)
    for r in rows:
        grouped[r["worker_id"]].append(r)
    return grouped


def contact_channels(conn: sqlite3.Connection, worker_id: int) -> list[ContactChannel]:
    rows = conn.execute(
        "SELECT type, address, is_preferred FROM contact_channel WHERE worker_id = ?"
        " ORDER BY is_preferred DESC, type",
        (worker_id,),
    )
    return [ContactChannel(type=r["type"], address=r["address"], is_preferred=bool(r["is_preferred"])) for r in rows]


def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=Page[WorkerRow])
def list_workers(conn: Db, search: str | None = None, limit: Limit = 20, cursor: Cursor = None):
    """Active workers sorted by name; `search` is a case-insensitive partial match on the full name."""
    after, params = keyset(cursor, ["last_name", "first_name", "id"])
    name_filter, name_params = "1", []
    if search:
        name_filter = "(first_name || ' ' || last_name) LIKE ? ESCAPE '\\'"
        name_params = [f"%{escape_like(search)}%"]
    rows = conn.execute(
        f"SELECT id, first_name, last_name, contract_type FROM worker"
        f" WHERE is_active = 1 AND {name_filter} AND {after}"
        " ORDER BY last_name, first_name, id LIMIT ?",
        (*name_params, *params, limit + 1),
    ).fetchall()
    rows, next_cursor = split_page(rows, limit, lambda r: (r["last_name"], r["first_name"], r["id"]))
    quals = qualifications_by_worker(conn, [r["id"] for r in rows])
    items = [
        WorkerRow(
            worker_id=r["id"], first_name=r["first_name"], last_name=r["last_name"], contract_type=r["contract_type"],
            qualifications=[QualificationRef(code=q["code"], name=q["name"]) for q in quals[r["id"]]],
        )
        for r in rows
    ]
    return Page(items=items, next_cursor=next_cursor)


@router.get("/{workerId}", response_model=WorkerDetail)
def worker_detail(conn: Db, worker_id: WorkerId):
    w = require_worker(conn, worker_id)
    week_start, week_end = week_bounds(clock.now())
    return WorkerDetail(
        worker_id=w["id"],
        first_name=w["first_name"],
        last_name=w["last_name"],
        contract_type=w["contract_type"],
        contract_hours_per_week=w["contract_hours_per_week"],
        hourly_rate_cents=w["hourly_rate_cents"],
        priority_factor=w["priority_factor"],
        language=w["language"],
        student_hours_external_ytd=w["student_hours_external_ytd"],
        is_active=bool(w["is_active"]),
        qualifications=[
            WorkerQualification(code=q["code"], name=q["name"], valid_until=q["valid_until"])
            for q in qualifications_by_worker(conn, [worker_id])[worker_id]
        ],
        contact_channels=contact_channels(conn, worker_id),
        worked_hours_this_week=worked_hours(conn, worker_id, week_start, week_end),
    )


@router.get("/{workerId}/contact-info", response_model=ContactInfo)
def worker_contact_info(conn: Db, worker_id: WorkerId):
    require_worker(conn, worker_id)
    return ContactInfo(channels=contact_channels(conn, worker_id))


@router.get("/{workerId}/history", response_model=Page[HistoryEntry])
def worker_history(conn: Db, worker_id: WorkerId, limit: Limit = 20, cursor: Cursor = None):
    """The worker's audit-log entries, newest first."""
    require_worker(conn, worker_id)
    after, params = keyset(cursor, ["occurred_at", "id"], descending=True)
    rows = conn.execute(
        f"SELECT id, occurred_at, actor, action, shift_id, payload FROM audit_event"
        f" WHERE worker_id = ? AND {after} ORDER BY occurred_at DESC, id DESC LIMIT ?",
        (worker_id, *params, limit + 1),
    ).fetchall()
    rows, next_cursor = split_page(rows, limit, lambda r: (r["occurred_at"], r["id"]))
    items = [
        HistoryEntry(
            occurred_at=r["occurred_at"], actor=r["actor"], action=r["action"], shift_id=r["shift_id"],
            changes=(
                [Change.model_validate(c) for c in json.loads(r["payload"])]
                if r["action"] == "worker_updated" and r["payload"] else None
            ),
        )
        for r in rows
    ]
    return Page(items=items, next_cursor=next_cursor)
