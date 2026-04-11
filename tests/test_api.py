"""API smoke tests for Game Test Tracker (FastAPI + SQLite in-memory)."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import database
from database import Base, get_db
from main import app

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_test_session = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

database._engine = _test_engine
database._SessionLocal = _test_session


def override_get_db():
    db = _test_session()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health(client):
    rv = client.get("/health")
    assert rv.status_code == 200
    assert rv.json() == {"status": "ok"}


def test_unauthorized(client):
    rv = client.get("/api/tasks")
    assert rv.status_code == 401


def test_crud_flow(client):
    headers = {"Authorization": "Basic YWRtaW46YWRtaW4xMjM="}

    # Create with full fields
    rv = client.post("/api/tasks", headers=headers, json={
        "task_name": "Bug #1",
        "publisher": "Studio A",
        "game_title": "RPG Quest",
        "reward_amount": 500,
        "payment_cost": 100,
        "payment_received_date": "2026-04-15",
    })
    assert rv.status_code == 201
    task = rv.json()
    assert task["task_name"] == "Bug #1"
    assert task["reward_amount"] == 500
    assert task["payment_cost"] == 100
    assert task["profit"] == 400  # auto-calculated
    assert task["payment_received_date"] == "2026-04-15"
    assert task["sort_order"] == 1
    task_id = task["id"]

    # List
    rv = client.get("/api/tasks", headers=headers)
    assert rv.status_code == 200
    assert len(rv.json()) == 1

    # Update profit fields
    rv = client.put(f"/api/tasks/{task_id}", headers=headers, json={
        "reward_amount": 600,
        "payment_cost": 150,
    })
    updated = rv.json()
    assert updated["profit"] == 450  # auto-calculated on update

    # Delete
    rv = client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert rv.status_code == 200


def test_reorder_flow(client):
    headers = {"Authorization": "Basic YWRtaW46YWRtaW4xMjM="}

    ids = []
    for name in ["Task A", "Task B", "Task C"]:
        rv = client.post("/api/tasks", headers=headers, json={"task_name": name})
        ids.append(rv.json()["id"])

    def get_order():
        rv = client.get("/api/tasks", headers=headers)
        return [t["id"] for t in rv.json()]

    assert get_order() == ids

    # Move A down → [B, A, C]
    rv = client.put("/api/tasks/reorder", headers=headers, json={"id": ids[0], "direction": "down"})
    assert rv.status_code == 200
    assert get_order() == [ids[1], ids[0], ids[2]]

    # Move C up → [B, C, A]
    rv = client.put("/api/tasks/reorder", headers=headers, json={"id": ids[2], "direction": "up"})
    assert rv.status_code == 200
    assert get_order() == [ids[1], ids[2], ids[0]]

    # Can't move first (B) up
    rv = client.put("/api/tasks/reorder", headers=headers, json={"id": ids[1], "direction": "up"})
    assert rv.status_code == 400

    # Can't move last (A) down
    rv = client.put("/api/tasks/reorder", headers=headers, json={"id": ids[0], "direction": "down"})
    assert rv.status_code == 400


def test_update_nonexistent(client):
    headers = {"Authorization": "Basic YWRtaW46YWRtaW4xMjM="}
    rv = client.put("/api/tasks/9999", headers=headers, json={"task_name": "X"})
    assert rv.status_code == 404
