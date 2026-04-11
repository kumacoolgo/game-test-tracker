"""HTTP Basic Auth via environment variables — timing-safe comparison."""

import os
import secrets
from fastapi import HTTPException, Security
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()

APP_USER = os.getenv("APP_USER", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin123")


def verify_credentials(credentials: HTTPBasicCredentials = Security(security)):
    correct_user = secrets.compare_digest(credentials.username, APP_USER)
    correct_pass = secrets.compare_digest(credentials.password, APP_PASSWORD)

    if not (correct_user and correct_pass):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
