"""Simple smoke tests for the Game Test Tracker API."""

import sys
sys.path.insert(0, ".")
import pytest

from app import create_app
from app.models import init_db
import tempfile, os

@pytest.fixture
def client():
    db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db.close()
    # Patch DATABASE path before importing app
    import app.models as models
    original_db = models.DATABASE
    models.DATABASE = db.name
    # Re-init to create schema in temp db
    from app.models import init_db
    init_db()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c
    models.DATABASE = original_db
    os.unlink(db.name)

def test_login_logout(client):
    rv = client.post("/api/login", json={"username":"admin","password":"admin123"})
    assert rv.status_code == 200
    assert rv.get_json()["username"] == "admin"

    rv = client.post("/api/logout")
    assert rv.status_code == 200

def test_crud_flow(client):
    # Login
    client.post("/api/login", json={"username":"admin","password":"admin123"})

    # Create
    rv = client.post("/api/tasks", json={"title":"Test Bug","priority":"high"})
    assert rv.status_code == 201
    task = rv.get_json()
    assert task["title"] == "Test Bug"
    task_id = task["id"]

    # Read
    rv = client.get("/api/tasks")
    assert rv.status_code == 200
    assert len(rv.get_json()) == 1

    # Update
    rv = client.put(f"/api/tasks/{task_id}", json={"status":"passed"})
    assert rv.get_json()["status"] == "passed"

    # Delete
    rv = client.delete(f"/api/tasks/{task_id}")
    assert rv.status_code == 200

def test_reorder(client):
    client.post("/api/login", json={"username":"admin","password":"admin123"})

    # Create 3 tasks
    ids = []
    for title in ["Task A","Task B","Task C"]:
        rv = client.post("/api/tasks", json={"title":title})
        ids.append(rv.get_json()["id"])

    # Move first task down
    rv = client.put("/api/tasks/reorder", json={"id":ids[0],"direction":"down"})
    assert rv.status_code == 200

    # Move last task up
    rv = client.put("/api/tasks/reorder", json={"id":ids[2],"direction":"up"})
    assert rv.status_code == 200

    # Can't move first task up
    rv = client.put("/api/tasks/reorder", json={"id":ids[0],"direction":"up"})
    assert rv.status_code == 400

    # Can't move last task down
    rv = client.put("/api/tasks/reorder", json={"id":ids[2],"direction":"down"})
    assert rv.status_code == 400
