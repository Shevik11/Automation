from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
import logging
from models.execution import WorkflowExecution
from models.workflow import WorkflowConfig, SavedPreset
from models.user import User
from schemas.execution import WorkflowExecutionCreate, ExecutionStatusUpdate
from services.n8n_service import n8n_service
from services.workflow_service import get_default_workflow_for_user, create_saved_preset
from schemas.workflow import SavedPresetCreate
import json

logger = logging.getLogger(__name__)


def get_executions_by_user(
    db: Session,
    user_id: int
) -> List[WorkflowExecution]:
    """Get all executions for a user"""
    return db.query(WorkflowExecution).filter(
        WorkflowExecution.user_id == user_id
    ).order_by(WorkflowExecution.created_at.desc()).all()


def get_execution_by_id(
    db: Session,
    execution_id: int,
    user_id: int
) -> Optional[WorkflowExecution]:
    """Get execution by ID (only if belongs to user)"""
    return db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.user_id == user_id
    ).first()


async def create_execution(
    db: Session,
    user: User,
    execution_data: WorkflowExecutionCreate
) -> WorkflowExecution:
    """Create a new execution and trigger n8n workflow"""
    logger.info(
        "Start create_execution. user_id=%s workflow_config_id=%s payload=%s",
        user.id,
        execution_data.workflow_config_id,
        execution_data.model_dump(),
    )

    # If workflow_config_id not provided, use default workflow
    if execution_data.workflow_config_id is None:
        default_workflow = get_default_workflow_for_user(db, user.id)
        if not default_workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Default workflow not found. Please contact administrator."
            )
        workflow_config_id = default_workflow.id
    else:
        workflow_config_id = execution_data.workflow_config_id
    
    # Verify workflow_config belongs to user
    workflow = db.query(WorkflowConfig).filter(
        WorkflowConfig.id == workflow_config_id,
        WorkflowConfig.user_id == user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow config not found or access denied"
        )
    
    # Create execution record
    db_execution = WorkflowExecution(
        user_id=user.id,
        workflow_config_id=workflow_config_id,
        keywords=execution_data.keywords,
        location=execution_data.location,
        status="pending"
    )
    db.add(db_execution)
    db.commit()
    db.refresh(db_execution)
    
    # Prepare data for n8n
    n8n_data = {
        "keywords": execution_data.keywords,
        "location": execution_data.location,
        "execution_id": str(db_execution.id)
    }
    
    # Try to parse keywords as JSON, if fails use as string
    try:
        keywords_json = json.loads(execution_data.keywords)
        n8n_data["keywords"] = keywords_json
    except (json.JSONDecodeError, TypeError):
        pass  # Use as string
    
    logger.info(
        "Triggering n8n workflow. user_id=%s workflow_id=%s webhook_path=%s n8n_data=%s",
        user.id,
        workflow.n8n_workflow_id,
        workflow.webhook_path or "none",
        n8n_data,
    )

    # Trigger n8n workflow
    try:
        n8n_response = await n8n_service.trigger_workflow(
            workflow.n8n_workflow_id,
            n8n_data,
            webhook_path=workflow.webhook_path,
            workflow_json=workflow.workflow_config_json,
        )
        
        # Update execution with n8n execution ID if provided
        if isinstance(n8n_response, dict):
            n8n_execution_id = n8n_response.get("executionId") or n8n_response.get("id")
            if n8n_execution_id:
                db_execution.n8n_execution_id = str(n8n_execution_id)
                db_execution.status = "running"
                db.commit()
                db.refresh(db_execution)
    except Exception as e:
        # Update status to error
        logger.exception(
            "Failed to trigger n8n workflow. user_id=%s workflow_id=%s n8n_data=%s",
            user.id,
            workflow.n8n_workflow_id,
            n8n_data,
        )
        db_execution.status = "error"
        db_execution.result = {"error": str(e)}
        db.commit()
        db.refresh(db_execution)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger n8n workflow: {str(e)}"
        )
    
    # If user wants to save as preset, create it
    if execution_data.save_as_preset and execution_data.preset_name:
        try:
            preset_data = SavedPresetCreate(
                workflow_config_id=workflow_config_id,
                preset_name=execution_data.preset_name,
                keywords=execution_data.keywords,
                location=execution_data.location
            )
            create_saved_preset(db, user, preset_data)
        except Exception as e:
            # Don't fail execution if preset creation fails
            print(f"Warning: Could not save preset: {e}")
    
    return db_execution


async def update_execution_status(
    db: Session,
    execution_id: int,
    user_id: int,
    status_update: ExecutionStatusUpdate
) -> WorkflowExecution:
    """Update execution status"""
    execution = get_execution_by_id(db, execution_id, user_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    execution.status = status_update.status
    if status_update.result is not None:
        execution.result = status_update.result
    if status_update.n8n_execution_id:
        execution.n8n_execution_id = status_update.n8n_execution_id
    
    if status_update.status in ["success", "error"]:
        execution.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(execution)
    return execution


async def cancel_execution(
    db: Session,
    execution_id: int,
    user_id: int
) -> WorkflowExecution:
    """Cancel an execution"""
    execution = get_execution_by_id(db, execution_id, user_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    # Try to cancel in n8n if execution_id exists
    if execution.n8n_execution_id:
        await n8n_service.cancel_execution(execution.n8n_execution_id)
    
    execution.status = "error"
    execution.completed_at = datetime.utcnow()
    execution.result = {"cancelled": True}
    
    db.commit()
    db.refresh(execution)
    return execution

