from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_config_id = Column(Integer, ForeignKey("workflow_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    keywords = Column(Text, nullable=False)  # JSON або текст
    location = Column(String, nullable=False)
    n8n_execution_id = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="pending")  # pending/running/success/error
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="workflow_executions")
    workflow_config = relationship("WorkflowConfig", back_populates="workflow_executions")
    linkedin_results = relationship("LinkedinResult", back_populates="execution", cascade="all, delete-orphan")

