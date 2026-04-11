"""HTTP Basic Auth via environment variables."""

import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()

APP_USER = os.getenv("APP_USER", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin123")


def verify_credentials(credentials: HTTPBasicCredentials = Security(security)):
    if credentials.username != APP_USER or credentials.password != APP_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
