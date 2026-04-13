"""Pydantic schemas — Game Test Tracker."""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TaskBase(BaseModel):
    test_name: str
    publisher: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    test_case: Optional[str] = None
    test_result: Optional[str] = None
    gamepack: Optional[str] = None

    work_time: Optional[str] = None

    income1: Optional[str] = None
    received_date1: Optional[str] = None

    payment: Optional[str] = None
    income2: Optional[str] = None
    received_date2: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    test_name: Optional[str] = None
    publisher: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    test_case: Optional[str] = None
    test_result: Optional[str] = None
    gamepack: Optional[str] = None

    work_time: Optional[str] = None

    income1: Optional[str] = None
    received_date1: Optional[str] = None

    payment: Optional[str] = None
    income2: Optional[str] = None
    received_date2: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    sort_order: int
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    id: int
    direction: str  # "up" or "down"
