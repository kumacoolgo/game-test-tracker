"""Pydantic schemas — Game Test Tracker."""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class TaskBase(BaseModel):
    task_name: str
    publisher: Optional[str] = None
    game_title: Optional[str] = None
    gamepack_url: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_testing_time: Optional[float] = None
    test_cases: Optional[str] = None
    test_results: Optional[str] = None
    reward_amount: Optional[float] = 0
    payment_cost: Optional[float] = 0
    payment_received_date: Optional[date] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    publisher: Optional[str] = None
    game_title: Optional[str] = None
    gamepack_url: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_testing_time: Optional[float] = None
    test_cases: Optional[str] = None
    test_results: Optional[str] = None
    reward_amount: Optional[float] = None
    payment_cost: Optional[float] = None
    payment_received_date: Optional[date] = None


class TaskResponse(TaskBase):
    id: int
    profit: Optional[float]
    sort_order: int
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    id: int
    direction: str  # "up" or "down"
