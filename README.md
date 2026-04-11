# Game Test Tracker

FastAPI + PostgreSQL task tracker for game testing. Deploys as a Docker container on Zeabur.

## Architecture

- **Backend**: FastAPI (serves UI + REST API on port 8080)
- **Database**: PostgreSQL (Zeabur)
- **Auth**: HTTP Basic Auth — browser handles login popup, no session/token needed
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

## Auth

Simply open the app in your browser. A native HTTP Basic Auth popup will appear. Enter your `APP_USER` / `APP_PASSWORD`. No separate login page needed.

## API Endpoints (all require Basic Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List tasks |
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
