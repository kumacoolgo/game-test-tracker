"""API routes for Game Test Tracker."""

import functools
from flask import Blueprint, request, jsonify, session, g
from .models import get_db

api = Blueprint("api", __name__)

# ─── Auth helpers ──────────────────────────────────────────────────────────

def require_auth(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper

# ─── Auth routes ────────────────────────────────────────────────────────────

@api.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "")
    password = data.get("password", "")

    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username FROM users WHERE username = ? AND password_hash = ?",
            (username, password)
        ).fetchone()

    if row:
        session["user_id"] = row["id"]
        session["username"] = row["username"]
        return jsonify({"success": True, "username": row["username"]})

    return jsonify({"error": "Invalid credentials"}), 401

@api.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@api.route("/me", methods=["GET"])
def me():
    if "user_id" in session:
        return jsonify({"username": session.get("username")})
    return jsonify({"username": None})

# ─── Tasks CRUD ──────────────────────────────────────────────────────────────

@api.route("/tasks", methods=["GET"])
@require_auth
def list_tasks():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY sort_order ASC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@api.route("/tasks", methods=["POST"])
@require_auth
def create_task():
    data = request.get_json()
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title required"}), 400

    description = data.get("description", "")
    status = data.get("status", "pending")
    priority = data.get("priority", "medium")

    with get_db() as conn:
        # Get max sort_order
        max_order = conn.execute(
            "SELECT COALESCE(MAX(sort_order), 0) FROM tasks"
        ).fetchone()[0]
        new_order = max_order + 1

        cursor = conn.execute(
            """INSERT INTO tasks (title, description, status, priority, sort_order)
               VALUES (?, ?, ?, ?, ?)""",
            (title, description, status, priority, new_order)
        )
        task_id = cursor.lastrowid

        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

    return jsonify(dict(row)), 201

@api.route("/tasks/<int:task_id>", methods=["PUT"])
@require_auth
def update_task(task_id):
    data = request.get_json()

    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        if not existing:
            return jsonify({"error": "Not found"}), 404

        conn.execute(
            """UPDATE tasks SET
               title = ?, description = ?, status = ?, priority = ?,
               updated_at = datetime('now')
               WHERE id = ?""",
            (
                data.get("title", existing["title"]),
                data.get("description", existing["description"]),
                data.get("status", existing["status"]),
                data.get("priority", existing["priority"]),
                task_id,
            )
        )

        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

    return jsonify(dict(row))

@api.route("/tasks/<int:task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        if not existing:
            return jsonify({"error": "Not found"}), 404

        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))

        # Re-normalize sort_order
        rows = conn.execute(
            "SELECT id FROM tasks ORDER BY sort_order ASC"
        ).fetchall()
        for idx, row in enumerate(rows):
            conn.execute(
                "UPDATE tasks SET sort_order = ? WHERE id = ?",
                (idx + 1, row["id"])
            )

    return jsonify({"success": True})

# ─── Reorder ─────────────────────────────────────────────────────────────────

@api.route("/tasks/reorder", methods=["PUT"])
@require_auth
def reorder_task():
    """
    Reorder a task up or down.
    Payload: { "id": <int>, "direction": "up" | "down" }
    """
    data = request.get_json()
    task_id = data.get("id")
    direction = data.get("direction")

    if not task_id or direction not in ("up", "down"):
        return jsonify({"error": "id and direction (up/down) required"}), 400

    with get_db() as conn:
        # Get all tasks ordered by sort_order
        all_tasks = conn.execute(
            "SELECT id, sort_order FROM tasks ORDER BY sort_order ASC"
        ).fetchall()

        task_list = [(r["id"], r["sort_order"]) for r in all_tasks]
        task_ids = [t[0] for t in task_list]

        if task_id not in task_ids:
            return jsonify({"error": "Task not found"}), 404

        current_idx = task_ids.index(task_id)

        if direction == "up" and current_idx == 0:
            return jsonify({"error": "Already at top"}), 400

        if direction == "down" and current_idx == len(task_ids) - 1:
            return jsonify({"error": "Already at bottom"}), 400

        # Swap sort_order with neighbor
        neighbor_idx = current_idx - 1 if direction == "up" else current_idx + 1
        current_id, current_order = task_list[current_idx]
        neighbor_id, neighbor_order = task_list[neighbor_idx]

        conn.execute(
            "UPDATE tasks SET sort_order = ? WHERE id = ?",
            (neighbor_order, current_id)
        )
        conn.execute(
            "UPDATE tasks SET sort_order = ? WHERE id = ?",
            (current_order, neighbor_id)
        )

    return jsonify({"success": True})
