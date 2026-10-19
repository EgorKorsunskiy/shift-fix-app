from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from app.timestamps import from_db, to_db

BRUSSELS = ZoneInfo("Europe/Brussels")


def test_to_db_converts_to_utc():
    # 2026-10-20 is still summer time in Brussels (UTC+2).
    assert to_db(datetime(2026, 10, 20, 9, 0, tzinfo=BRUSSELS)) == "2026-10-20T07:00Z"


def test_to_db_handles_dst_change():
    # After 2026-10-25 Brussels is on winter time (UTC+1).
    assert to_db(datetime(2026, 10, 26, 9, 0, tzinfo=BRUSSELS)) == "2026-10-26T08:00Z"


def test_to_db_drops_seconds():
    assert to_db(datetime(2026, 10, 20, 7, 0, 59, 999, tzinfo=timezone.utc)) == "2026-10-20T07:00Z"


def test_to_db_rejects_naive_datetime():
    with pytest.raises(ValueError):
        to_db(datetime(2026, 10, 20, 7, 0))


def test_round_trip():
    dt = datetime(2026, 10, 20, 7, 30, tzinfo=timezone.utc)

    assert from_db(to_db(dt)) == dt
