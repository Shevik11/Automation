from app.database import Base
from sqlalchemy import Column, ForeignKey, Integer, String, Text


class LinkedinResult(Base):
    __tablename__ = "linkedin_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    workflow_execution_id = Column(Integer, nullable=True, index=True)
    vacancy_link = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    company_linkedin_page = Column(String, nullable=True)
    detail = Column(Text, nullable=True)
    hiring_manager_name = Column(String, nullable=True)
