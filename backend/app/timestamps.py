"""DB timestamp format: UTC, minute precision, 'YYYY-MM-DDTHH:MMZ'.

Every timestamp written to the DB goes through to_db(), so stored strings
always share one format and compare chronologically.
"""

from datetime import datetime, timezone

DB_FORMAT = "%Y-%m-%dT%H:%MZ"


def to_db(dt: datetime) -> str:
    """Convert an aware datetime to UTC and format it, dropping seconds."""
    if dt.tzinfo is None:
        raise ValueError("naive datetime: pass a timezone-aware datetime")
    return dt.astimezone(timezone.utc).strftime(DB_FORMAT)


def from_db(value: str) -> datetime:
    return datetime.strptime(value, DB_FORMAT).replace(tzinfo=timezone.utc)
