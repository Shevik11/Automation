from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from app.database import Base


class WorkflowConfig(Base):
    __tablename__ = "workflow_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_name = Column(String, nullable=False)  # назва в n8n
    n8n_workflow_id = Column(String, nullable=False, index=True)
    webhook_path = Column(String, nullable=True)  # optional explicit webhook path
    workflow_config_json = Column(JSON, nullable=True)  # Full n8n workflow JSON
    workflow_version = Column(String, nullable=True)    # Version ID from JSON
    is_active = Column(Boolean, default=True, nullable=False)
    run_interval_minutes = Column(Integer, default=15, nullable=False)  # How often to run (in minutes)
    last_run_at = Column(DateTime(timezone=True), nullable=True)  # Last execution time
    description = Column(Text, nullable=True)
    source_file = Column(String, nullable=True)  # e.g., "automation.json"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Table constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'n8n_workflow_id', name='unique_user_n8n_workflow'),
    )

    # Relationships
    user = relationship("User", back_populates="workflow_configs")
    workflow_executions = relationship("WorkflowExecution", back_populates="workflow_config", cascade="all, delete-orphan")
    saved_presets = relationship("SavedPreset", back_populates="workflow_config", cascade="all, delete-orphan")


class SavedPreset(Base):
    __tablename__ = "saved_presets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_config_id = Column(Integer, ForeignKey("workflow_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    preset_name = Column(String, nullable=False)
    keywords = Column(String, nullable=False)  # JSON або текст
    location = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="saved_presets")
    workflow_config = relationship("WorkflowConfig", back_populates="saved_presets")

