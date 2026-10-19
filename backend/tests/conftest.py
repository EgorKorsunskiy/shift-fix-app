import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app
from tests.factories import T0


@pytest.fixture(autouse=True)
def fixed_now(monkeypatch):
    """Pin the backend clock to the demo morning: Tuesday 2026-10-20 07:00 UTC (09:00 in Brussels)."""
    monkeypatch.setenv("SHIFTFIX_NOW", T0)
    return T0


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    """Point the app at a fresh, empty database file for this test."""
    path = str(tmp_path / "test.db")
    monkeypatch.setenv("SHIFTFIX_DB_PATH", path)
    return path


@pytest.fixture
def conn(db_path):
    connection = db.connect()
    db.init_db(connection)
    yield connection
    connection.close()


@pytest.fixture
def client(conn):
    with TestClient(app) as test_client:
        yield test_client
