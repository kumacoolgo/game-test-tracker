"""FastAPI entry point — serves UI + REST API."""

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from database import get_engine, Base, get_db
from schemas import TaskCreate, TaskUpdate, TaskResponse, ReorderRequest
from auth import verify_credentials
from sqlalchemy.orm import Session
from sqlalchemy import text
import crud


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
    yield


app = FastAPI(title="Game Test Tracker", lifespan=lifespan)

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")


# ─── REST API ───────────────────────────────────────────────────────────────

@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    return crud.get_tasks(db)


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    return crud.create_task(db, payload)


@app.put("/api/tasks/reorder")
def reorder_task(payload: ReorderRequest, db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    if payload.direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction must be 'up' or 'down'")

    task = crud.reorder_task(db, payload.id, payload.direction)
    if not task:
        raise HTTPException(
            status_code=400,
            detail="Already at top" if payload.direction == "up" else "Already at bottom"
        )
    return {"message": "reordered"}


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    task = crud.update_task(db, task_id, payload)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    ok = crud.delete_task(db, task_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "deleted"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
