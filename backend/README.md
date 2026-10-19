# ShiftFix backend

FastAPI + SQLite. The domain model is in [`../docs/backend/domain.md`](../docs/backend/domain.md), and the API spec is in [`../docs/frontend/shiftfix-openapi.yaml`](../docs/frontend/shiftfix-openapi.yaml).

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

## Run

```bash
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Then open:
- http://localhost:8000/ for the hello world page
- http://localhost:8000/docs for the interactive API docs

## API

All endpoints are under `/api/v1`. They follow `docs/frontend/shiftfix-openapi.yaml`: camelCase fields, `{ "error": "CODE" }` errors, and cursor pagination `?limit=&cursor=`.

| Endpoint | Status |
|---|---|
| `GET /shifts/current`, `GET /shifts?from&to`, `GET /shifts/{shiftId}`, `GET /shifts/{shiftId}/offers` | done |
| `GET /workers?search`, `GET /workers/{workerId}`, `GET /workers/{workerId}/contact-info`, `GET /workers/{workerId}/history` | done |
| `GET /shifts/{shiftId}/replacements`, `GET /shifts/{shiftId}/exclusions` | done |
| `POST /absences`, `POST /shifts/{shiftId}/offers`, `PATCH /workers/{workerId}` | todo |

**Rule engine.** Replacement candidates come from `app/replacements.py`:
1. `facts.py` loads what the engine needs about each active worker.
2. `rules.py` applies the hard rules, a set of pure functions configured by `rules.json`. Every rule runs, so exclusions list every rule a worker fails.
3. `ranking.py` scores the eligible workers 0..100.

The rules and weights are described in `docs/backend/domain.md`. The boundary tests are in `tests/test_rules.py`.

**Clock.** "Now" comes from `app/clock.py`. To pin it for a demo or for tests, set `SHIFTFIX_NOW`:

```bash
SHIFTFIX_NOW=2026-10-20T07:00Z .venv/bin/uvicorn app.main:app --reload
```

## Database

SQLite. The schema is in [`app/schema.sql`](app/schema.sql), copied from the SQL blocks in `domain.md`. `tests/test_db.py` fails if the two drift apart, so change both together.

- **File:** `backend/shiftfix.db` by default. Override it with `SHIFTFIX_DB_PATH`.
- **Creation:** the schema is created on startup when the database is empty. `PRAGMA user_version` stores the schema version.
- **Reset:** stop the server and delete `shiftfix.db*`.
- **Code conventions:**
  - Get a connection with `db.get_db` (a FastAPI dependency).
  - Do atomic writes inside `with db.transaction(conn):` (`BEGIN IMMEDIATE`).
  - Format timestamps only with `timestamps.to_db` / `from_db`.

## Test

```bash
.venv/bin/pytest
```
