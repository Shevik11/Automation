from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy.orm import Session
from typing import List
import logging
from app.database import get_db
from utils.dependencies import get_current_user
from models.user import User
from services.execution_service import (
    get_executions_by_user,
    get_execution_by_id,
    create_execution,
    update_execution_status,
    cancel_execution
)
from schemas.execution import (
    WorkflowExecutionCreate,
    WorkflowExecutionResponse,
    ExecutionStatusUpdate,
    ExecutionDataRow,
)

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("", response_model=List[WorkflowExecutionResponse])
async def get_executions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all executions for current user"""
    executions = get_executions_by_user(db, current_user.id)
    return executions


@router.get("/export")
async def export_executions(
    format: str = "csv",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export executions for current user.
    Currently supports CSV (default).
    """
    fmt = format.lower()
    if fmt != "csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV export is supported"
        )

    executions = get_executions_by_user(db, current_user.id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "id",
            "workflow_config_id",
            "status",
            "keywords",
            "location",
            "n8n_execution_id",
            "created_at",
            "completed_at",
        ]
    )
    for ex in executions:
        writer.writerow(
            [
                ex.id,
                ex.workflow_config_id,
                ex.status,
                ex.keywords,
                ex.location,
                ex.n8n_execution_id or "",
                ex.created_at.isoformat() if ex.created_at else "",
                ex.completed_at.isoformat() if ex.completed_at else "",
            ]
        )

    output.seek(0)
    headers = {
        "Content-Disposition": 'attachment; filename="executions.csv"'
    }
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers=headers,
    )


@router.get("/data", response_model=list[ExecutionDataRow])
async def get_executions_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all data collected for the user from database.

    This endpoint is intended to be used on the "Переглянути дані" page, where we want to
    show business data (e.g. вакансії), not технічні статуси виконань.

    It reads the `result` JSON field from successful executions in the database.
    """
    rows: list[ExecutionDataRow] = []
    
    # Get data from database executions
    executions = get_executions_by_user(db, current_user.id)
    for ex in executions:
        # We only return rows where there is some result JSON
        if not ex.result:
            continue

        # Normalise different possible shapes of result:
        # - if it's already a dict -> return as is
        # - if it's a list -> wrap into {"items": [...]}
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
    db: Session = Depends(get_db)
):
    """Get execution by ID"""
    execution = get_execution_by_id(db, execution_id, current_user.id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    return execution


@router.post("", response_model=WorkflowExecutionResponse, status_code=status.HTTP_201_CREATED)
async def create_execution_endpoint(
    execution_data: WorkflowExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new execution and trigger n8n workflow"""
    logger = logging.getLogger(__name__)
    logger.info(
        "Create execution request. user_id=%s payload=%s",
        current_user.id,
        execution_data.model_dump(),
    )
    try:
        execution = await create_execution(db, current_user, execution_data)
        return execution
    except HTTPException as http_exc:
        logger.exception(
            "Failed to create execution (HTTPException). user_id=%s payload=%s",
            current_user.id,
            execution_data.model_dump(),
        )
        raise http_exc
    except Exception as exc:
        logger.exception(
            "Unexpected error creating execution. user_id=%s payload=%s",
            current_user.id,
            execution_data.model_dump(),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create execution",
        ) from exc


@router.post("/{execution_id}/cancel", response_model=WorkflowExecutionResponse)
async def cancel_execution_endpoint(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an execution"""
    execution = await cancel_execution(db, execution_id, current_user.id)
    return execution


@router.patch("/{execution_id}/status", response_model=WorkflowExecutionResponse)
async def update_execution_status_endpoint(
    execution_id: int,
    status_update: ExecutionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update execution status (used by webhooks or background tasks)"""
    execution = await update_execution_status(
        db,
        execution_id,
        current_user.id,
        status_update
    )
    return execution


@router.post("/trigger-celery-task")
async def trigger_celery_task_manually(
    current_user: User = Depends(get_current_user)
):
    """Manually trigger Celery task to check and run workflows (for testing)"""
    try:
        from tasks import check_and_trigger_n8n_workflows
        task = check_and_trigger_n8n_workflows.delay()
        return {
            "status": "triggered",
            "task_id": task.id,
            "message": "Celery task has been queued. Check logs for results."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger Celery task: {str(e)}"
        )

