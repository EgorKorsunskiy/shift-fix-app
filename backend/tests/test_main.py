import os

from fastapi.testclient import TestClient

from app.main import app


def test_hello_page(db_path):
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Hello, world!" in response.text


def test_startup_creates_database(db_path):
    assert not os.path.exists(db_path)

    with TestClient(app):
        pass

    assert os.path.exists(db_path)
