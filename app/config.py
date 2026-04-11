"""Game Test Tracker - Flask application with SQLite."""

import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    DATABASE_PATH = os.environ.get("DATABASE_PATH", "game_tracker.db")

    # Rate limiting
    LOGIN_RATE_LIMIT = 5  # per minute per IP
    SESSION_TIMEOUT = 3600  # 1 hour

    # Admin credentials (override with env vars)
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
