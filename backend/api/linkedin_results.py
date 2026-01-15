from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from utils.dependencies import get_current_user
from models.user import User
from models.linkedin_result import LinkedinResult
from schemas.linkedin import LinkedinResultResponse


router = APIRouter(prefix="/linkedin-results", tags=["linkedin_results"])


@router.get("", response_model=List[LinkedinResultResponse])
async def get_linkedin_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Повертає всі рядки з таблиці linkedin_results.

    Наразі таблиця не має user_id, тому фільтрація по користувачу неможлива.
    Вважаємо, що дані належать поточному користувачу (система single-tenant).
    """
    results = db.query(LinkedinResult).order_by(LinkedinResult.id).all()
    return results


