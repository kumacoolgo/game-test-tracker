"""CRUD operations for tasks — with concurrency-safe reorder."""

from sqlalchemy.orm import Session
from sqlalchemy import func, select
from models import Task
from schemas import TaskCreate, TaskUpdate


def get_tasks(db: Session) -> list[Task]:
    return db.query(Task).order_by(Task.sort_order).all()


def get_task(db: Session, task_id: int) -> Task | None:
    return db.query(Task).filter(Task.id == task_id).first()


def create_task(db: Session, task_in: TaskCreate) -> Task:
    # Use func.max instead of full table scan
    max_order = db.query(func.max(Task.sort_order)).scalar()
    next_order = (max_order or 0) + 1

    task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority,
        sort_order=next_order,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, task_in: TaskUpdate) -> Task | None:
    task = get_task(db, task_id)
    if not task:
        return None

    for field, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    task = get_task(db, task_id)
    if not task:
        return False

    db.delete(task)

    # Renormalize sort_order for remaining tasks
    remaining = db.query(Task).order_by(Task.sort_order).all()
    for idx, t in enumerate(remaining):
        t.sort_order = idx + 1

    db.commit()
    return True


def reorder_task(db: Session, task_id: int, direction: str) -> Task | None:
    """
    Swap sort_order with neighbor task (up or down).
    Uses SELECT FOR UPDATE to prevent concurrent reorder conflicts.
    """
    # Lock all tasks in sort_order order — prevents concurrent reorder races
    all_tasks = db.execute(
        select(Task).order_by(Task.sort_order).with_for_update()
    ).scalars().all()

    task_ids = [t.id for t in all_tasks]

    if task_id not in task_ids:
        return None

    current_idx = task_ids.index(task_id)

    if direction == "up" and current_idx == 0:
        return None  # Already at top

    if direction == "down" and current_idx == len(task_ids) - 1:
        return None  # Already at bottom

    neighbor_idx = current_idx - 1 if direction == "up" else current_idx + 1

    current_task = all_tasks[current_idx]
    neighbor_task = all_tasks[neighbor_idx]

    # Swap sort_orders atomically within this transaction
    current_task.sort_order, neighbor_task.sort_order = (
        neighbor_task.sort_order,
        current_task.sort_order,
    )

    db.commit()
    db.refresh(current_task)
    return current_task
