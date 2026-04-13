"""SQLAlchemy ORM models — Game Test Tracker."""

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    test_name = Column(String(255), nullable=False)
    publisher = Column(String(255))

    start_date = Column(String(20))
    end_date = Column(String(20))

    test_case = Column(Text)
    test_result = Column(Text)
    gamepack = Column(Text)

    work_time = Column(String(20))

    income1 = Column(String(20))
    received_date1 = Column(String(20))

    payment = Column(String(20))
    income2 = Column(String(20))
    received_date2 = Column(String(20))

    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
