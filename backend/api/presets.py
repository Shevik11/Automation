from typing import List

from app.database import get_db
from fastapi import APIRouter, Depends, status
from models.user import User
from schemas.workflow import SavedPresetCreate, SavedPresetResponse
from services.workflow_service import (
    create_saved_preset,
    delete_saved_preset,
    get_saved_presets_by_user,
)
from sqlalchemy.orm import Session
from utils.dependencies import get_current_user

router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("", response_model=List[SavedPresetResponse])
async def get_presets(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all saved presets for current user"""
    presets = get_saved_presets_by_user(db, current_user.id)
    return presets


@router.post(
    "", response_model=SavedPresetResponse, status_code=status.HTTP_201_CREATED
)
async def create_preset(
    preset_data: SavedPresetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new saved preset"""
    try:
        preset = create_saved_preset(db, current_user, preset_data)
        return preset
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create preset: {str(e)}",
        )




@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved preset"""
    success = delete_saved_preset(db, preset_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found"
        )
