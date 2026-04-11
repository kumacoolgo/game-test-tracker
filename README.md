# Game Test Tracker

FastAPI + PostgreSQL task tracker for game testing. Deploys as a Docker container on Zeabur.

## Architecture

- **Backend**: FastAPI (serves UI + REST API on port 8080)
- **Database**: PostgreSQL (Zeabur)
- **Auth**: HTTP Basic Auth via environment variables (handled by browser)
- **Container**: GHCR Docker image (`ghcr.io/kumacoolgo/game-test-tracker:latest`)

## Quick Start (Local Dev)

```bash
pip install -r requirements.txt
# Set DATABASE_URL for local PostgreSQL
uvicorn main:app --reload --port 8080
```

## Deploy on Zeabur

1. Create PostgreSQL on Zeabur → copy `DATABASE_URL`
2. Deploy from GHCR: `ghcr.io/kumacoolgo/game-test-tracker:latest`
3. Configure env vars:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `APP_USER` = login username (default: admin)
   - `APP_PASSWORD` = login password
4. Map port `8080`
5. Bind app service to PostgreSQL network

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/login | Fake login (returns {"username": "admin"}) |
| POST | /api/logout | Fake logout |
| GET | /api/me | Current user |
| GET | /api/tasks | List tasks (auth required) |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/{id} | Update task |
| DELETE | /api/tasks/{id} | Delete task |
| PUT | /api/tasks/reorder | Reorder task (`{"id": 1, "direction": "up\|down"}`) |
| GET | /health | Health check (no auth) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://... | PostgreSQL connection string |
| APP_USER | admin | Basic auth username |
| APP_PASSWORD | admin123 | Basic auth password |
