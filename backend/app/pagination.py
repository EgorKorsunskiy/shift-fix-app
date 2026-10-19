"""Cursor pagination: `?limit=20&cursor=abc` -> `{ items, nextCursor }`.

Keyset-based: the cursor encodes the sort key of the last returned row.
"""

import base64
import binascii
import json
from collections.abc import Callable, Sequence
from typing import Annotated, Any, TypeVar

from fastapi import Query

from app.errors import ApiError

Limit = Annotated[int, Query(ge=1, le=100)]
Cursor = Annotated[str | None, Query()]

R = TypeVar("R")


def encode_cursor(values: Sequence[Any]) -> str:
    return base64.urlsafe_b64encode(json.dumps(list(values)).encode()).decode().rstrip("=")


def decode_cursor(cursor: str, size: int) -> list[Any]:
    try:
        values = json.loads(base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
    except (binascii.Error, ValueError):
        raise ApiError(422, "VALIDATION_ERROR")
    if not isinstance(values, list) or len(values) != size:
        raise ApiError(422, "VALIDATION_ERROR")
    return values


def keyset(cursor: str | None, columns: Sequence[str], descending: bool = False) -> tuple[str, list[Any]]:
    """SQL condition selecting rows after the cursor, e.g. "(s.starts_at, s.id) > (?, ?)"."""
    if cursor is None:
        return "1", []
    values = decode_cursor(cursor, len(columns))
    op = "<" if descending else ">"
    return f"({', '.join(columns)}) {op} ({', '.join('?' * len(columns))})", values


def offset_page(items: list[R], limit: int, cursor: str | None) -> tuple[list[R], str | None]:
    """For lists computed in memory (e.g. ranked candidates): the cursor is an offset."""
    offset = decode_cursor(cursor, 1)[0] if cursor else 0
    if not isinstance(offset, int) or offset < 0:
        raise ApiError(422, "VALIDATION_ERROR")
    end = offset + limit
    return items[offset:end], encode_cursor([end]) if end < len(items) else None


def split_page(rows: list[R], limit: int, sort_key: Callable[[R], Sequence[Any]]) -> tuple[list[R], str | None]:
    """Rows were fetched with LIMIT limit + 1; the extra row tells whether a next page exists."""
    if len(rows) <= limit:
        return rows, None
    rows = rows[:limit]
    return rows, encode_cursor(sort_key(rows[-1]))
