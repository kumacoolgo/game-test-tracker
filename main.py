"""FastAPI entry point — serves UI + REST API."""

from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse

from database import get_engine, Base, get_db
from schemas import TaskCreate, TaskUpdate, TaskResponse, ReorderRequest
from auth import verify_credentials
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from models import Task
import crud
import pandas as pd
import io


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
        raise HTTPException(status_code=400, detail="Invalid reorder")
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


# ─── Excel Import / Export ───────────────────────────────────────────────────

@app.get("/api/export")
def export_tasks(db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    tasks = crud.get_tasks(db)
    data = []
    for t in tasks:
        d = {
            "id": t.id,
            "test_name": t.test_name,
            "publisher": t.publisher,
            "start_date": t.start_date,
            "end_date": t.end_date,
            "test_case": t.test_case,
            "test_result": t.test_result,
            "gamepack": t.gamepack,
            "work_time": t.work_time,
            "income1": t.income1,
            "received_date1": t.received_date1,
            "payment": t.payment,
            "income2": t.income2,
            "received_date2": t.received_date2,
            "sort_order": t.sort_order,
        }
        data.append(d)

    df = pd.DataFrame(data)
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name="Tasks")
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tasks.xlsx"},
    )


@app.post("/api/import")
async def import_tasks(file: UploadFile = File(...), db: Session = Depends(get_db), _username=Depends(verify_credentials)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx / .xls files supported")

    df = pd.read_excel(file.file)

    # 读取已有最大 sort_order
    max_order = db.query(func.max(Task.sort_order)).scalar() or 0

    imported = 0
    for _, row in df.iterrows():
        task_data = {
            "test_name": str(row.get("test_name", "")),
            "publisher": str(row["publisher"]) if pd.notna(row.get("publisher")) else None,
            "start_date": str(row["start_date"]) if pd.notna(row.get("start_date")) else None,
            "end_date": str(row["end_date"]) if pd.notna(row.get("end_date")) else None,
            "test_case": str(row["test_case"]) if pd.notna(row.get("test_case")) else None,
            "test_result": str(row["test_result"]) if pd.notna(row.get("test_result")) else None,
            "gamepack": str(row["gamepack"]) if pd.notna(row.get("gamepack")) else None,
            "work_time": str(row["work_time"]) if pd.notna(row.get("work_time")) else None,
            "income1": str(row["income1"]) if pd.notna(row.get("income1")) else None,
            "received_date1": str(row["received_date1"]) if pd.notna(row.get("received_date1")) else None,
            "payment": str(row["payment"]) if pd.notna(row.get("payment")) else None,
            "income2": str(row["income2"]) if pd.notna(row.get("income2")) else None,
            "received_date2": str(row["received_date2"]) if pd.notna(row.get("received_date2")) else None,
            "sort_order": max_order + imported + 1,
        }
        task = Task(**task_data)
        db.add(task)
        imported += 1

    if imported > 0:
        db.commit()

    return {"status": "ok", "imported": imported}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
