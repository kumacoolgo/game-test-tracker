"""SQLAlchemy ORM models — Game Test Tracker."""

from sqlalchemy import Column, Integer, String, Text, Date, Numeric, DateTime
from sqlalchemy.sql import func
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    # 基本信息
    task_name = Column(String(255), nullable=False)
    publisher = Column(String(255))
    game_title = Column(String(255))
    gamepack_url = Column(Text)

    # 时间
    start_date = Column(Date)
    end_date = Column(Date)
    total_testing_time = Column(Numeric(6, 2))

    # 测试内容
    test_cases = Column(Text)
    test_results = Column(Text)

    # 财务
    reward_amount = Column(Numeric(10, 2))
    payment_cost = Column(Numeric(10, 2))
    profit = Column(Numeric(10, 2))
    payment_received_date = Column(Date)

    # 排序
    sort_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
