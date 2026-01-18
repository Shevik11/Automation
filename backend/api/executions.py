import csv
import io
from typing import List

from app.database import get_db
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from models.user import User
from schemas.execution import (
    ExecutionDataRow,
    ExecutionStatusUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionResponse,
)
from services.execution_service import ExecutionService
from sqlalchemy.orm import Session
from tasks import check_and_trigger_n8n_workflows
from utils.dependencies import get_current_user
from utils.exceptions import (
    raise_execution_not_found_error,
    raise_unsupported_format_error,
    raise_workflow_operation_error,
)
from utils.logger import execution_logger

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("", response_model=List[WorkflowExecutionResponse])
async def get_executions(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all executions for current user"""
    return ExecutionService.get_user_executions(db, current_user)


@router.get("/export")
async def export_executions(
    format: str = "csv",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export executions for current user
    TODO: Add support for other formats (JSON, Excel, etc.)
    """
    fmt = format.lower()
    if fmt != "csv":
        raise_unsupported_format_error("export", ["csv"])

    return ExecutionService.export_executions_csv(db, current_user)


@router.get("/data", response_model=list[ExecutionDataRow])
async def get_executions_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows: list[ExecutionDataRow] = []

    # Get data from database executions
    executions = get_executions_by_user(db, current_user.id)
    for ex in executions:
        # We only return rows where there is some result JSON
        if not ex.result:
            continue

        # Normalise different possible shapes of result:
        data: dict
        if isinstance(ex.result, dict):
            data = ex.result
        elif isinstance(ex.result, list):
            data = {"items": ex.result}
        else:
            # Fallback: just put raw value under "value" key
            data = {"value": ex.result}

        rows.append(
            ExecutionDataRow(
                execution_id=ex.id,
                workflow_config_id=ex.workflow_config_id,
                created_at=ex.created_at,
                completed_at=ex.completed_at,
                data=data,
                source="database",
            )
        )

    return rows


@router.get("/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_execution(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get execution by ID"""
    return ExecutionService.get_execution_by_id(db, execution_id, current_user)


@router.post(
    "", response_model=WorkflowExecutionResponse, status_code=status.HTTP_201_CREATED
)
async def create_execution_endpoint(
    execution_data: WorkflowExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new execution and trigger n8n workflow"""
    execution_logger.log_operation(
        "execution_creation",
        "started",
        f"user_id={current_user.id}, keywords='{execution_data.keywords}', location='{execution_data.location}'"
    )
    try:
        execution = await create_execution(db, current_user, execution_data)
        execution_logger.log_operation(
            "execution_creation",
            "successful",
            f"execution_id={execution.id}, user_id={current_user.id}"
        )
        return execution
    except Exception as exc:
        execution_logger.log_error(exc, "execution creation")
        raise_workflow_operation_error("Failed to create execution")


@router.post("/{execution_id}/cancel", response_model=WorkflowExecutionResponse)
async def cancel_execution_endpoint(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an execution"""
    execution = await cancel_execution(db, execution_id, current_user.id)
    return execution


@router.patch("/{execution_id}/status", response_model=WorkflowExecutionResponse)
async def update_execution_status_endpoint(
    execution_id: int,
    status_update: ExecutionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update execution status (used by webhooks or background tasks)"""
    execution = await update_execution_status(
        db, execution_id, current_user.id, status_update
    )
    return execution


@router.post("/trigger-celery-task")
async def trigger_celery_task_manually(current_user: User = Depends(get_current_user)):
    """Manually trigger Celery task to check and run workflows (for testing)"""
    try:

        task = check_and_trigger_n8n_workflows.delay()
        return {
            "status": "triggered",
            "task_id": task.id,
            "message": "Celery task has been queued. Check logs for results.",
        }
    except Exception as e:
        execution_logger.log_error(e, "celery task trigger")
        raise_workflow_operation_error(f"Failed to trigger Celery task: {str(e)}")
