"""Insert helpers for tests: sensible defaults, override any column by keyword."""

import json
import sqlite3

T0 = "2026-10-20T07:00Z"


def insert(conn: sqlite3.Connection, table: str, row: dict) -> int:
    cols = ", ".join(row)
    params = ", ".join(f":{c}" for c in row)
    return conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({params})", row).lastrowid


def add_worker(conn, **overrides) -> int:
    return insert(conn, "worker", {
        "first_name": "Anna", "last_name": "Peeters", "hourly_rate_cents": 1500,
        "contract_type": "part_time", "contract_hours_per_week": 20, "priority_factor": 0,
        "language": "nl", "student_hours_external_ytd": 0, "is_active": 1, "created_at": T0,
    } | overrides)


def add_qualification(conn, code: str = "barista", name: str | None = None) -> int:
    return insert(conn, "qualification", {"code": code, "name": name or code.replace("_", " ").capitalize()})


def grant(conn, worker_id: int, qualification_id: int, valid_until: str | None = None) -> None:
    insert(conn, "worker_qualification",
           {"worker_id": worker_id, "qualification_id": qualification_id, "valid_until": valid_until})


def add_shift(conn, qualification_id: int, worker_id: int | None, starts_at: str, ends_at: str,
              status: str | None = None) -> int:
    return insert(conn, "shift", {
        "qualification_id": qualification_id, "worker_id": worker_id, "starts_at": starts_at, "ends_at": ends_at,
        "status": status or ("scheduled" if worker_id else "open"), "created_at": T0, "updated_at": T0,
    })


def add_offer(conn, shift_id: int, worker_id: int, **overrides) -> int:
    return insert(conn, "offer", {
        "shift_id": shift_id, "worker_id": worker_id, "wave": 1, "status": "pending", "sent_at": T0,
    } | overrides)


def add_channel(conn, worker_id: int, type: str, address: str, is_preferred: bool = False) -> int:
    return insert(conn, "contact_channel",
                  {"worker_id": worker_id, "type": type, "address": address, "is_preferred": int(is_preferred)})


def add_time_entry(conn, worker_id: int, started_at: str, ended_at: str) -> int:
    return insert(conn, "time_entry", {"worker_id": worker_id, "started_at": started_at, "ended_at": ended_at})


def add_absence(conn, worker_id: int, starts_at: str, ends_at: str, type: str = "sick") -> int:
    return insert(conn, "absence", {
        "worker_id": worker_id, "type": type, "starts_at": starts_at, "ends_at": ends_at, "created_at": T0,
    })


def add_preference(conn, worker_id: int, start_time: str, end_time: str, kind: str = "prefer",
                   weekday: int | None = None) -> int:
    return insert(conn, "worker_preference", {
        "worker_id": worker_id, "weekday": weekday, "start_time": start_time, "end_time": end_time, "kind": kind,
    })


def add_audit(conn, action: str, occurred_at: str = T0, worker_id: int | None = None, shift_id: int | None = None,
              actor: str = "system", payload=None) -> int:
    return insert(conn, "audit_event", {
        "occurred_at": occurred_at, "actor": actor, "action": action, "worker_id": worker_id,
        "shift_id": shift_id, "payload": None if payload is None else json.dumps(payload),
    })
