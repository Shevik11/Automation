from app.database import Base
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class LinkedinResult(Base):
    __tablename__ = "linkedin_results"

    id = Column(Integer, primary_key=True, index=True)
    workflow_execution_id = Column(
        Integer,
        ForeignKey("workflow_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vacancy_link = Column(String, nullable=False)
    title = Column(String, nullable=False)

    # Relationships
    execution = relationship("WorkflowExecution", back_populates="linkedin_results")
