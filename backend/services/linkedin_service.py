from typing import List
from sqlalchemy.orm import Session

from models.execution import WorkflowExecution
from models.linkedin_result import LinkedinResult
from models.user import User


class LinkedinService:
    @staticmethod
    def get_user_linkedin_results(
        db: Session, user: User, limit: int = 50, offset: int = 0
    ) -> List[LinkedinResult]:
        """
        Get LinkedIn results for a specific user with pagination
        Uses join to avoid N+1 query problem
        """
        return (
            db.query(LinkedinResult)
            .join(WorkflowExecution)
            .filter(WorkflowExecution.user_id == user.id)
            .order_by(LinkedinResult.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_all_linkedin_results(db: Session) -> List[LinkedinResult]:
        """
        Get all LinkedIn results (debug endpoint)
        """
        return db.query(LinkedinResult).order_by(LinkedinResult.id.desc()).all()
