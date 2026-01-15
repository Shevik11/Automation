from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from utils.dependencies import get_current_user
from models.user import User
from services.workflow_service import (
    get_workflow_configs_by_user,
    get_workflow_config_by_id,
    create_workflow_config,
    update_workflow_config,
    delete_workflow_config,
    get_saved_presets_by_user,
    create_saved_preset,
    delete_saved_preset,
    get_default_workflow_for_user,
    update_default_workflow_from_file,
    update_workflow_active_status
)
from schemas.workflow import (
    WorkflowConfigCreate,
    WorkflowConfigResponse,
    SavedPresetCreate,
    SavedPresetResponse,
    WorkflowJsonExport,
    WorkflowFileImport,
    WorkflowActivate,
    StaticFilesList
)

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=List[WorkflowConfigResponse])
async def get_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workflow configs for current user. Auto-creates default workflow if missing."""
    from services.workflow_service import create_default_workflow_for_user
    import logging
    logger = logging.getLogger(__name__)
    
    workflows = get_workflow_configs_by_user(db, current_user.id)
    
    # If no workflows exist, auto-create the default one from automation.json
    if not workflows:
        try:
            logger.info(f"No workflows found for user {current_user.id}, creating default workflow")
            default_workflow = create_default_workflow_for_user(db, current_user)
            workflows = [default_workflow]
        except Exception as e:
            logger.exception(f"Could not auto-create default workflow for user {current_user.id}: {str(e)}")
            # Return empty list if default workflow creation fails
            workflows = []
    
    return workflows


@router.post("", response_model=WorkflowConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow config"""
    workflow = create_workflow_config(db, current_user, workflow_data)
    return workflow


# ============================================================================
# SPECIFIC ROUTES - MUST come before /{workflow_id} generic routes
# ============================================================================

@router.get("/active", response_model=List[WorkflowConfigResponse])
async def get_active_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active workflow configs for current user"""
    from models.workflow import WorkflowConfig
    workflows = db.query(WorkflowConfig).filter(
        WorkflowConfig.user_id == current_user.id,
        WorkflowConfig.is_active == True
    ).all()
    return workflows


@router.get("/default", response_model=WorkflowConfigResponse)
async def get_default_workflow(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get default workflow for current user (from automation.json). Creates it if doesn't exist."""
    from services.workflow_service import create_default_workflow_for_user
    
    workflow = get_default_workflow_for_user(db, current_user.id)
    if not workflow:
        # Auto-create default workflow if it doesn't exist
        workflow = create_default_workflow_for_user(db, current_user)
    # FastAPI should automatically convert using from_attributes=True
    return workflow


@router.get("/static-files", response_model=StaticFilesList)
async def get_static_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List available JSON files in static directory"""
    from services.file_service import list_static_json_files
    
    try:
        files = list_static_json_files()
        return StaticFilesList(files=files)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list static files: {str(e)}"
        )


@router.post("/import-file", response_model=WorkflowConfigResponse, status_code=status.HTTP_200_OK)
async def import_workflow_from_file(
    file_data: WorkflowFileImport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import/update workflow from static file (e.g., automation.json)
    Updates the default workflow for the user
    """
    if file_data.filename != "automation.json":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only automation.json is supported for default workflow"
        )
    
    try:
        workflow = update_default_workflow_from_file(db, current_user)
        return workflow
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import workflow: {str(e)}"
        )


@router.get("/presets", response_model=List[SavedPresetResponse])
async def get_presets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all saved presets for current user"""
    presets = get_saved_presets_by_user(db, current_user.id)
    # FastAPI should automatically convert using from_attributes=True
    return presets


@router.post("/presets", response_model=SavedPresetResponse, status_code=status.HTTP_201_CREATED)
async def create_preset(
    preset_data: SavedPresetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
            detail=str(e)
        )


@router.post("/initialize-presets", status_code=status.HTTP_200_OK)
async def initialize_default_presets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize default presets for existing user"""
    from services.workflow_service import create_saved_preset
    from schemas.workflow import SavedPresetCreate

    try:
        # Get default workflow
        default_workflow = get_default_workflow_for_user(db, current_user.id)
        if not default_workflow:
            # Try to create it if it doesn't exist
            from services.workflow_service import create_default_workflow_for_user
            default_workflow = create_default_workflow_for_user(db, current_user)

        # Check if user already has presets
        existing_presets = get_saved_presets_by_user(db, current_user.id)
        if existing_presets:
            return {"message": "Presets already exist", "count": len(existing_presets)}

        # Create default presets
        default_presets = [
            {
                "preset_name": "Пошук вакансій у Києві",
                "workflow_config_id": default_workflow.id,
                "keywords": "Python developer",
                "location": "Київ"
            },
            {
                "preset_name": "Пошук вакансій у Львові",
                "workflow_config_id": default_workflow.id,
                "keywords": "Frontend developer",
                "location": "Львів"
            },
            {
                "preset_name": "Пошук вакансій у Харкові",
                "workflow_config_id": default_workflow.id,
                "keywords": "DevOps engineer",
                "location": "Харків"
            },
            {
                "preset_name": "Пошук вакансій у Одесі",
                "workflow_config_id": default_workflow.id,
                "keywords": "Data Scientist",
                "location": "Одеса"
            }
        ]

        created_presets = []
        for preset_data in default_presets:
            preset_create = SavedPresetCreate(**preset_data)
            preset = create_saved_preset(db, current_user, preset_create)
            created_presets.append(preset)

        return {"message": "Default presets created", "count": len(created_presets)}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize presets: {str(e)}"
        )


@router.delete("/presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a saved preset"""
    success = delete_saved_preset(db, preset_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset not found"
        )


# ============================================================================
# PARAMETRIZED ROUTES - Must come after specific literal routes
# ============================================================================

@router.get("/{workflow_id}/json", response_model=WorkflowJsonExport)
async def get_workflow_json(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workflow JSON configuration (sanitized - credentials removed)"""
    from utils.workflow_validator import sanitize_workflow_json
    
    workflow = get_workflow_config_by_id(db, workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    if not workflow.workflow_config_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow JSON not available"
        )
    
    # Sanitize workflow JSON before returning (remove sensitive credentials)
    sanitized_json = sanitize_workflow_json(workflow.workflow_config_json)
    
    return WorkflowJsonExport(workflow_json=sanitized_json)


@router.patch("/{workflow_id}/activate", response_model=WorkflowConfigResponse)
async def activate_workflow_endpoint(
    workflow_id: int,
    activate_data: WorkflowActivate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate or deactivate workflow"""
    workflow = update_workflow_active_status(
        db, workflow_id, current_user.id, activate_data.is_active
    )
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowConfigResponse)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update workflow config"""
    workflow = update_workflow_config(db, workflow_id, current_user.id, workflow_data)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    return workflow


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete workflow config"""
    success = delete_workflow_config(db, workflow_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )


@router.get("/{workflow_id}", response_model=WorkflowConfigResponse)
async def get_workflow(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workflow config by ID"""
    workflow = get_workflow_config_by_id(db, workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    return workflow
