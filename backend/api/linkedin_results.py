from typing import List

from app.database import get_db
from fastapi import APIRouter, Depends
from models.linkedin_result import LinkedinResult
from models.user import User
from schemas.linkedin import LinkedinResultResponse
from services.linkedin_service import LinkedinService
from sqlalchemy.orm import Session
from utils.dependencies import get_current_user

router = APIRouter(prefix="/linkedin-results", tags=["linkedin_results"])


@router.get("", response_model=List[LinkedinResultResponse])
async def get_linkedin_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
) -> List[LinkedinResult]:
    """
    Get LinkedIn results for the current user with pagination
    """
    return LinkedinService.get_user_linkedin_results(
        db=db, user=current_user, limit=limit, offset=offset
    )


@router.get("/debug")
async def get_all_linkedin_results_debug(db: Session = Depends(get_db)) -> List[LinkedinResult]:
    """
    Get all LinkedIn results for debugging purposes
    """
    return LinkedinService.get_all_linkedin_results(db=db)
