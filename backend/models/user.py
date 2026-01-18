from app.database import Base
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    workflow_configs = relationship(
        "WorkflowConfig", back_populates="user", cascade="all, delete-orphan"
    )
    workflow_executions = relationship(
        "WorkflowExecution", back_populates="user", cascade="all, delete-orphan"
    )
    saved_presets = relationship(
        "SavedPreset", back_populates="user", cascade="all, delete-orphan"
    )
