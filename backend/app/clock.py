"""The backend's clock. SHIFTFIX_NOW pins it for demos and tests, e.g. '2026-10-20T07:00Z'."""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.timestamps import from_db

LOCAL_TZ = ZoneInfo("Europe/Brussels")


def now() -> datetime:
    fixed = os.environ.get("SHIFTFIX_NOW")
    return from_db(fixed) if fixed else datetime.now(timezone.utc)
