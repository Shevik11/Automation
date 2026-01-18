import logging
from typing import List

from app.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from models.user import User
from schemas.workflow import (
    StaticFilesList,
    WorkflowActivate,
    WorkflowConfigCreate,
    WorkflowConfigResponse,
    WorkflowFileImport,
    WorkflowJsonExport,
)
from services.file_service import list_static_json_files
from services.workflow_service import WorkflowService, update_default_workflow_from_file
from sqlalchemy.orm import Session
from utils.dependencies import get_current_user

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=List[WorkflowConfigResponse])
async def get_workflows(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all workflow configs for current user. Auto-creates default workflow if missing"""
    return WorkflowService.get_user_workflows_with_auto_create(db, current_user)


@router.post(
    "", response_model=WorkflowConfigResponse, status_code=status.HTTP_201_CREATED
)
async def create_workflow(
    workflow_data: WorkflowConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workflow config"""
    return WorkflowService.create_workflow(db, current_user, workflow_data)

@router.get("/active", response_model=List[WorkflowConfigResponse])
async def get_active_workflows(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all active workflow configs for current user"""
    return WorkflowService.get_active_workflows(db, current_user)


@router.get("/default", response_model=WorkflowConfigResponse)
async def get_default_workflow(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get default workflow for current user (from automation.json). Creates it if doesn't exist"""
    return WorkflowService.get_default_workflow_with_auto_create(db, current_user)


@router.get("/static-files", response_model=StaticFilesList)
async def get_static_files(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """List available JSON files in static directory"""

    try:
        files = list_static_json_files()
        return StaticFilesList(files=files)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.exception("Failed to list static files")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while listing static files",
        ) from e


@router.post(
    "/import-file",
    response_model=WorkflowConfigResponse,
    status_code=status.HTTP_200_OK,
)
async def import_workflow_from_file(
    file_data: WorkflowFileImport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import/update workflow from static file (e.g., automation.json)
    Updates the default workflow for the user
    """
    if file_data.filename != "automation.json":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only automation.json is supported for default workflow",
        )

    try:
        workflow = update_default_workflow_from_file(db, current_user)
        return workflow
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.exception("Failed to import workflow from file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error importing workflow from file",
        ) from e

@router.get("/{workflow_id}/json", response_model=WorkflowJsonExport)
async def get_workflow_json(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workflow JSON configuration (sanitized - credentials removed)"""
    sanitized_json = WorkflowService.get_workflow_json(db, workflow_id, current_user.id)
    return WorkflowJsonExport(workflow_json=sanitized_json)


@router.patch("/{workflow_id}/activate", response_model=WorkflowConfigResponse)
async def activate_workflow_endpoint(
    workflow_id: int,
    activate_data: WorkflowActivate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activate or deactivate workflow"""
    return WorkflowService.toggle_workflow_active(
        db, workflow_id, current_user.id, activate_data.is_active
    )


@router.put("/{workflow_id}", response_model=WorkflowConfigResponse)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update workflow config"""
    return WorkflowService.update_workflow(db, workflow_id, current_user.id, workflow_data)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete workflow config"""
    WorkflowService.delete_workflow(db, workflow_id, current_user.id)


@router.get("/{workflow_id}", response_model=WorkflowConfigResponse)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workflow config by ID"""
    return WorkflowService.get_workflow_by_id(db, workflow_id, current_user.id)
