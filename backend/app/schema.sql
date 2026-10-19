-- ShiftFix SQLite schema. Source of truth: docs/backend/domain.md.
-- Keep in sync: tests/test_db.py fails if this differs from the SQL blocks there.

PRAGMA journal_mode = WAL;

CREATE TABLE worker (
  id                         INTEGER PRIMARY KEY,
  first_name                 TEXT    NOT NULL,
  last_name                  TEXT    NOT NULL,
  hourly_rate_cents          INTEGER NOT NULL,   -- EUR gross per hour, in cents
  contract_type              TEXT    NOT NULL,   -- contract_type
  contract_hours_per_week    REAL    NOT NULL,
  priority_factor            INTEGER NOT NULL,   -- 0..3, ranking only
  language                   TEXT    NOT NULL,   -- language
  student_hours_external_ytd REAL    NOT NULL,   -- students only; 0 for everyone else
  is_active                  INTEGER NOT NULL,   -- 0/1
  created_at                 TEXT    NOT NULL    -- UTC
);

CREATE TABLE qualification (
  id   INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,   -- e.g. 'cashier', 'bakery', 'forklift'
  name TEXT NOT NULL
);

CREATE TABLE worker_qualification (
  worker_id        INTEGER NOT NULL REFERENCES worker(id),
  qualification_id INTEGER NOT NULL REFERENCES qualification(id),
  valid_until      TEXT,   -- 'YYYY-MM-DD' certificate expiry; NULL = never expires
  PRIMARY KEY (worker_id, qualification_id)
);
CREATE INDEX ix_wq_qualification ON worker_qualification(qualification_id);

CREATE TABLE contact_channel (
  id           INTEGER PRIMARY KEY,
  worker_id    INTEGER NOT NULL REFERENCES worker(id),
  type         TEXT    NOT NULL,   -- channel_type
  address      TEXT    NOT NULL,
  is_preferred INTEGER NOT NULL,   -- 0/1
  UNIQUE (worker_id, type)
);
CREATE UNIQUE INDEX ux_contact_preferred ON contact_channel(worker_id) WHERE is_preferred = 1;

CREATE TABLE worker_preference (
  id         INTEGER PRIMARY KEY,
  worker_id  INTEGER NOT NULL REFERENCES worker(id),
  weekday    INTEGER,            -- ISO weekday 1..7; NULL = every day
  start_time TEXT    NOT NULL,   -- 'HH:MM' local
  end_time   TEXT    NOT NULL,   -- 'HH:MM' local
  kind       TEXT    NOT NULL    -- preference_kind
);
CREATE INDEX ix_pref_worker ON worker_preference(worker_id);

CREATE TABLE shift (
  id               INTEGER PRIMARY KEY,
  qualification_id INTEGER NOT NULL REFERENCES qualification(id),
  worker_id        INTEGER REFERENCES worker(id),   -- NULL while open
  starts_at        TEXT    NOT NULL,                -- UTC
  ends_at          TEXT    NOT NULL,                -- UTC; may cross local midnight
  status           TEXT    NOT NULL,                -- shift_status
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);
CREATE INDEX ix_shift_worker_start ON shift(worker_id, starts_at);
CREATE INDEX ix_shift_status_start ON shift(status, starts_at);

CREATE TABLE time_entry (
  id         INTEGER PRIMARY KEY,
  worker_id  INTEGER NOT NULL REFERENCES worker(id),
  shift_id   INTEGER REFERENCES shift(id),   -- the planned shift this entry fulfils, if any
  started_at TEXT    NOT NULL,               -- UTC
  ended_at   TEXT    NOT NULL                -- UTC
);
CREATE INDEX ix_time_entry_worker_start ON time_entry(worker_id, started_at);
CREATE INDEX ix_time_entry_shift        ON time_entry(shift_id);

CREATE TABLE absence (
  id         INTEGER PRIMARY KEY,
  worker_id  INTEGER NOT NULL REFERENCES worker(id),
  type       TEXT    NOT NULL,   -- absence_type
  starts_at  TEXT    NOT NULL,   -- UTC
  ends_at    TEXT    NOT NULL,   -- UTC
  created_at TEXT    NOT NULL
);
CREATE INDEX ix_absence_worker_start ON absence(worker_id, starts_at);

CREATE TABLE offer (
  id           INTEGER PRIMARY KEY,
  shift_id     INTEGER NOT NULL REFERENCES shift(id),
  worker_id    INTEGER NOT NULL REFERENCES worker(id),
  wave         INTEGER NOT NULL,   -- batch number in the offer cascade, starting at 1
  status       TEXT    NOT NULL,   -- offer_status
  channel      TEXT,               -- channel_type the offer was sent through
  score        REAL,               -- ranking score 0..100 when sent
  sent_at      TEXT    NOT NULL,
  expires_at   TEXT,
  responded_at TEXT,
  UNIQUE (shift_id, worker_id)
);
CREATE UNIQUE INDEX ux_offer_one_accepted ON offer(shift_id) WHERE status = 'accepted';
CREATE INDEX ix_offer_worker_status ON offer(worker_id, status);

CREATE TABLE audit_event (
  id          INTEGER PRIMARY KEY,
  occurred_at TEXT    NOT NULL,
  actor       TEXT    NOT NULL,   -- 'system' | 'manager' | 'bot' | 'worker:<id>'
  action      TEXT    NOT NULL,   -- absence_reported, shift_opened, offer_sent, offer_declined,
                                  -- offer_accepted, shift_assigned, assignment_rejected,
                                  -- worker_updated
  shift_id    INTEGER REFERENCES shift(id),
  worker_id   INTEGER REFERENCES worker(id),
  payload     TEXT                -- JSON
);
CREATE INDEX ix_audit_shift ON audit_event(shift_id);
