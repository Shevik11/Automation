from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from pathlib import Path
import json
from models.workflow import WorkflowConfig, SavedPreset
from models.user import User
from schemas.workflow import WorkflowConfigCreate, SavedPresetCreate
from utils.workflow_validator import (
    validate_workflow_for_import,
    extract_workflow_metadata,
    sanitize_workflow_json,
    InvalidWorkflowJsonError,
    WorkflowImportError
)


def get_workflow_configs_by_user(
    db: Session,
    user_id: int
) -> List[WorkflowConfig]:
    """Get all workflow configs for a user"""
    return db.query(WorkflowConfig).filter(WorkflowConfig.user_id == user_id).all()


def get_default_workflow_for_user(
    db: Session,
    user_id: int
) -> Optional[WorkflowConfig]:
    """Get default workflow for user (from automation.json)"""
    return db.query(WorkflowConfig).filter(
        WorkflowConfig.user_id == user_id,
        WorkflowConfig.source_file == "automation.json"
    ).first()


def get_workflow_config_by_id(
    db: Session,
    workflow_id: int,
    user_id: int
) -> Optional[WorkflowConfig]:
    """Get workflow config by ID (only if belongs to user)"""
    return db.query(WorkflowConfig).filter(
        WorkflowConfig.id == workflow_id,
        WorkflowConfig.user_id == user_id
    ).first()


def update_workflow_active_status(
    db: Session,
    workflow_id: int,
    user_id: int,
    is_active: bool
) -> Optional[WorkflowConfig]:
    """Update workflow active status"""
    workflow = get_workflow_config_by_id(db, workflow_id, user_id)
    if not workflow:
        return None
    
    workflow.is_active = is_active
    db.commit()
    db.refresh(workflow)
    return workflow


def update_workflow_config(
    db: Session,
    workflow_id: int,
    user_id: int,
    workflow_data: WorkflowConfigCreate
) -> Optional[WorkflowConfig]:
    """Update workflow config"""
    workflow = get_workflow_config_by_id(db, workflow_id, user_id)
    if not workflow:
        return None
    
    workflow.workflow_name = workflow_data.workflow_name
    workflow.n8n_workflow_id = workflow_data.n8n_workflow_id
    if workflow_data.webhook_path is not None:
        workflow.webhook_path = workflow_data.webhook_path
    if workflow_data.run_interval_minutes is not None:
        workflow.run_interval_minutes = workflow_data.run_interval_minutes
    if workflow_data.is_active is not None:
        workflow.is_active = workflow_data.is_active
    if workflow_data.workflow_config_json is not None:
        workflow.workflow_config_json = workflow_data.workflow_config_json
    if workflow_data.workflow_version is not None:
        workflow.workflow_version = workflow_data.workflow_version
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.source_file is not None:
        workflow.source_file = workflow_data.source_file
    
    db.commit()
    db.refresh(workflow)
    return workflow


def delete_workflow_config(
    db: Session,
    workflow_id: int,
    user_id: int
) -> bool:
    """Delete workflow config"""
    workflow = get_workflow_config_by_id(db, workflow_id, user_id)
    if not workflow:
        return False
    
    db.delete(workflow)
    db.commit()
    return True


def create_workflow_config(
    db: Session,
    user: User,
    workflow_data: WorkflowConfigCreate
) -> WorkflowConfig:
    """Create a new workflow config"""
    db_workflow = WorkflowConfig(
        user_id=user.id,
        workflow_name=workflow_data.workflow_name,
        n8n_workflow_id=workflow_data.n8n_workflow_id,
        webhook_path=workflow_data.webhook_path,
        run_interval_minutes=workflow_data.run_interval_minutes,
        is_active=workflow_data.is_active,
        workflow_config_json=workflow_data.workflow_config_json,
        workflow_version=workflow_data.workflow_version,
        description=workflow_data.description,
        source_file=workflow_data.source_file,
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow


def get_saved_presets_by_user(
    db: Session,
    user_id: int
) -> List[SavedPreset]:
    """Get all saved presets for a user"""
    return db.query(SavedPreset).filter(SavedPreset.user_id == user_id).all()


def get_saved_preset_by_id(
    db: Session,
    preset_id: int,
    user_id: int
) -> Optional[SavedPreset]:
    """Get saved preset by ID (only if belongs to user)"""
    return db.query(SavedPreset).filter(
        SavedPreset.id == preset_id,
        SavedPreset.user_id == user_id
    ).first()


def create_saved_preset(
    db: Session,
    user: User,
    preset_data: SavedPresetCreate
) -> SavedPreset:
    """Create a new saved preset"""
    # Verify workflow_config belongs to user
    workflow = get_workflow_config_by_id(db, preset_data.workflow_config_id, user.id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow config not found or access denied"
        )
    
    db_preset = SavedPreset(
        user_id=user.id,
        workflow_config_id=preset_data.workflow_config_id,
        preset_name=preset_data.preset_name,
        keywords=preset_data.keywords,
        location=preset_data.location
    )
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    return db_preset


def delete_saved_preset(
    db: Session,
    preset_id: int,
    user_id: int
) -> bool:
    """Delete a saved preset"""
    preset = get_saved_preset_by_id(db, preset_id, user_id)
    if not preset:
        return False
    
    db.delete(preset)
    db.commit()
    return True


def load_default_workflow_json() -> Dict[str, Any]:
    """Load default workflow from automation.json file"""
    from services.file_service import read_json_from_static
    
    try:
        return read_json_from_static("automation.json")
    except FileNotFoundError as e:
        raise WorkflowImportError(f"Default workflow file not found: {str(e)}")
    except InvalidWorkflowJsonError:
        raise  # Re-raise validation errors
    except Exception as e:
        raise WorkflowImportError(f"Failed to load workflow file: {str(e)}")


def update_default_workflow_from_file(
    db: Session,
    user: User
) -> WorkflowConfig:
    """
    Update default workflow for user from automation.json file
    Useful when automation.json has been updated
    """
    # Get existing default workflow
    existing = db.query(WorkflowConfig).filter(
        WorkflowConfig.user_id == user.id,
        WorkflowConfig.source_file == "automation.json"
    ).first()
    
    if not existing:
        # If doesn't exist, create it
        return create_default_workflow_for_user(db, user)
    
    # Load updated workflow JSON from file
    try:
        workflow_json = load_default_workflow_json()
    except WorkflowImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except InvalidWorkflowJsonError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workflow JSON: {e.message}"
        )
    
    # Extract metadata from JSON
    workflow_name = workflow_json.get("name", "DOU")
    n8n_workflow_id = workflow_json.get("id")
    version_id = workflow_json.get("versionId")
    # Don't change is_active status when updating from file - preserve user's choice
    # Only set to False if workflow was just created and has no executions yet
    
    if not n8n_workflow_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow JSON must contain 'id' field with n8n workflow ID"
        )
    
    # Update existing workflow config
    existing.workflow_name = workflow_name
    existing.n8n_workflow_id = n8n_workflow_id
    existing.workflow_config_json = workflow_json
    existing.workflow_version = version_id
    # Keep existing is_active status - don't override user's choice
    
    db.commit()
    db.refresh(existing)
    return existing


def create_default_workflow_for_user(
    db: Session,
    user: User
) -> WorkflowConfig:
    """
    Create default workflow for user from automation.json
    This is called automatically when user registers.
    Simply loads the JSON and creates workflow config - no n8n API calls.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Starting create_default_workflow_for_user for user {user.id}")
    
    # Check if user already has the default workflow
    try:
        existing = db.query(WorkflowConfig).filter(
            WorkflowConfig.user_id == user.id,
            WorkflowConfig.source_file == "automation.json"
        ).first()
        
        if existing:
            logger.info(f"Default workflow already exists for user {user.id}")
            return existing
    except Exception as e:
        logger.exception(f"Error checking existing workflow: {str(e)}")
        raise
    
    # Load workflow JSON from file
    logger.info(f"Loading workflow JSON from automation.json")
    try:
        workflow_json = load_default_workflow_json()
        logger.info(f"Successfully loaded workflow JSON")
    except WorkflowImportError as e:
        logger.exception(f"WorkflowImportError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except InvalidWorkflowJsonError as e:
        logger.exception(f"InvalidWorkflowJsonError: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workflow JSON: {e.message}"
        )
    
    # Extract metadata from JSON
    logger.info(f"Extracting metadata from workflow JSON")
    workflow_name = workflow_json.get("name", "DOU")
    n8n_workflow_id = workflow_json.get("id")
    version_id = workflow_json.get("versionId")
    # Workflow should be inactive by default until user creates first execution with parameters
    is_active = False
    
    logger.info(f"Workflow metadata - name: {workflow_name}, n8n_id: {n8n_workflow_id}, active: {is_active}")
    
    if not n8n_workflow_id:
        logger.error(f"Workflow JSON missing 'id' field")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Workflow JSON must contain 'id' field with n8n workflow ID"
        )
    
    # Create workflow config in database
    logger.info(f"Creating WorkflowConfig object for user {user.id}")
    try:
        db_workflow = WorkflowConfig(
            user_id=user.id,
            workflow_name=workflow_name,
            n8n_workflow_id=n8n_workflow_id,
            workflow_config_json=workflow_json,
            workflow_version=version_id,
            is_active=is_active,  # Inactive by default until first execution is created
            run_interval_minutes=15,  # Default interval
            source_file="automation.json"
        )
        logger.info(f"Adding WorkflowConfig to session")
        db.add(db_workflow)
        logger.info(f"Committing to database")
        db.commit()
        logger.info(f"Refreshing from database")
        db.refresh(db_workflow)
        logger.info(f"Successfully created default workflow for user {user.id}: workflow_id={db_workflow.id}")
        return db_workflow
    except Exception as e:
        logger.exception(f"Error creating workflow config: {str(e)}")
        db.rollback()
        raise

