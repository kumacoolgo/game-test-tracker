"""Database models with sort_order support."""

import sqlite3
from datetime import datetime
from contextlib import contextmanager

DATABASE = "game_tracker.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_sort ON tasks(sort_order);
"""

def get_db_connection(db_path=None):
    """Create a database connection. Uses DATABASE path by default."""
    path = db_path or DATABASE
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database with schema."""
    with get_db() as conn:
        conn.executescript(SCHEMA)
        # Insert default admin if not exists
        cursor = conn.execute(
            "SELECT id FROM users WHERE username = 'admin'"
        )
        if not cursor.fetchone():
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES ('admin', 'admin123')"
            )
