"""SQLite access: connections, schema initialisation and transactions.

Conventions (docs/backend/domain.md):
- The DB enforces only NOT NULL and UNIQUE; FK enforcement stays off.
- Writes that must be atomic go through transaction() (BEGIN IMMEDIATE).
"""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA_PATH = Path(__file__).with_name("schema.sql")
SCHEMA_VERSION = 1
DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "shiftfix.db"


def db_path() -> str:
    return os.environ.get("SHIFTFIX_DB_PATH", str(DEFAULT_DB_PATH))


def connect(path: str | None = None) -> sqlite3.Connection:
    # Autocommit mode: transactions are opened explicitly with transaction().
    conn = sqlite3.connect(path or db_path(), isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create the schema on an empty database; no-op if it is already there."""
    (version,) = conn.execute("PRAGMA user_version").fetchone()
    if version >= SCHEMA_VERSION:
        return
    conn.executescript(SCHEMA_PATH.read_text())
    conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")


@contextmanager
def transaction(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """Run a block in BEGIN IMMEDIATE ... COMMIT; roll back on any error."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
    except BaseException:
        conn.execute("ROLLBACK")
        raise
    conn.execute("COMMIT")


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: one connection per request."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()
