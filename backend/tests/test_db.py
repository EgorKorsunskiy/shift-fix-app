import re
import sqlite3
from pathlib import Path

import pytest

from app import db
from tests.factories import add_worker

DOMAIN_MD = Path(__file__).resolve().parents[2] / "docs" / "backend" / "domain.md"

TABLES = {
    "worker", "qualification", "worker_qualification", "contact_channel", "worker_preference",
    "shift", "time_entry", "absence", "offer", "audit_event",
}


def normalize_sql(sql: str) -> str:
    without_comments = re.sub(r"--[^\n]*", "", sql)
    return " ".join(without_comments.split())


def test_schema_sql_matches_domain_md():
    md_sql = "\n".join(re.findall(r"```sql\n(.*?)```", DOMAIN_MD.read_text(), re.S))

    assert normalize_sql(db.SCHEMA_PATH.read_text()) == normalize_sql(md_sql)


def test_init_creates_schema(conn):
    tables = {r["name"] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}

    assert tables == TABLES
    assert conn.execute("PRAGMA user_version").fetchone()[0] == db.SCHEMA_VERSION
    assert conn.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    assert conn.execute("PRAGMA foreign_keys").fetchone()[0] == 0


def test_init_is_idempotent(conn):
    add_worker(conn)

    db.init_db(conn)

    assert conn.execute("SELECT COUNT(*) FROM worker").fetchone()[0] == 1


def test_not_null_is_enforced(conn):
    with pytest.raises(sqlite3.IntegrityError, match="NOT NULL"):
        add_worker(conn, first_name=None)


def test_unique_is_enforced(conn):
    conn.execute("INSERT INTO qualification (code, name) VALUES ('bakery', 'Bakery')")

    with pytest.raises(sqlite3.IntegrityError, match="UNIQUE"):
        conn.execute("INSERT INTO qualification (code, name) VALUES ('bakery', 'Other')")


def test_value_checks_are_left_to_the_backend(conn):
    # domain.md: no CHECK constraints, the backend validates ranges and enums.
    add_worker(conn, priority_factor=7, contract_type="unknown")


def test_transaction_commits(conn):
    with db.transaction(conn):
        add_worker(conn)

    assert conn.execute("SELECT COUNT(*) FROM worker").fetchone()[0] == 1


def test_transaction_rolls_back_on_error(conn):
    with pytest.raises(RuntimeError):
        with db.transaction(conn):
            add_worker(conn)
            raise RuntimeError("boom")

    assert conn.execute("SELECT COUNT(*) FROM worker").fetchone()[0] == 0
