import csv
import io
from typing import List, Optional

from app.database import get_db
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from models.user import User
from models.workflow import WorkflowConfig
from schemas.execution import (
    ExecutionDataRow,
    ExecutionStatusUpdate,
    WorkflowExecutionCreate,
    WorkflowExecutionResponse,
)
from services.execution_service import ExecutionService
from services.n8n_service import N8NService
from services.workflow_service import WorkflowService
from sqlalchemy.orm import Session
from tasks import check_and_trigger_n8n_workflows
from utils.dependencies import get_current_user
from utils.exceptions import (
    raise_execution_not_found_error,
    raise_unsupported_format_error,
    raise_workflow_operation_error,
)
from utils.logger import execution_logger
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("", response_model=List[WorkflowExecutionResponse])
async def get_executions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    workflow_config_id: Optional[int] = None,
):
    """Get all executions for current user with pagination, optionally filtered by workflow_config_id"""
    return ExecutionService.get_user_executions(
        db, current_user, limit=limit, offset=offset, workflow_config_id=workflow_config_id
    )


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
    limit: int = 50,
    offset: int = 0,
):
    rows: list[ExecutionDataRow] = []

    # Get data from database executions
    executions = ExecutionService.get_user_executions(db, current_user, limit=limit, offset=offset)
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
@limiter.limit("20/minute")
async def create_execution_endpoint(
    request: Request,
    execution_data: WorkflowExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new execution with an independent n8n workflow instance, then trigger it"""
    execution_logger.log_operation(
        "execution_creation",
        "started",
        f"user_id={current_user.id}, keywords='{execution_data.keywords}', location='{execution_data.location}'"
    )
    try:
        # 1. Get workflow config (used as template only — never mutated)
        workflow_config = None
        if execution_data.workflow_config_id:
            workflow_config = db.query(WorkflowConfig).filter(
                WorkflowConfig.id == execution_data.workflow_config_id,
                WorkflowConfig.user_id == current_user.id,
            ).first()

        if not workflow_config:
            raise_workflow_operation_error("Workflow config not found")

        # 2. Create a fresh n8n workflow instance for this execution,
        #    with user_id baked in so the Schedule Trigger writes the correct owner.
        n8n_svc = N8NService()
        execution_logger.log_operation(
            "instance_workflow_create",
            "started",
            f"workflow_config_id={workflow_config.id}"
        )
        workflow_json = N8NService.inject_user_id_into_workflow(
            workflow_config.workflow_config_json, current_user.id
        )
        workflow_json = N8NService.replace_schedule_trigger_with_webhook(workflow_json)
        created = await n8n_svc.create_workflow_from_json(workflow_json)
        new_n8n_id = created.get("id")
        execution_logger.log_operation(
            "instance_workflow_create",
            "successful",
            f"new_n8n_id={new_n8n_id}"
        )

        # 3. Move to configured folder if set
        if n8n_svc.folder_id and new_n8n_id:
            await n8n_svc.move_workflow_to_folder(new_n8n_id, n8n_svc.folder_id)

        # 4. Resolve the actual webhook path from the persisted n8n instance
        #    (n8n assigns a new webhookId on creation, so the template path is stale)
        persisted_wf = await n8n_svc.get_workflow(new_n8n_id)
        resolved_webhook_path = n8n_svc._extract_webhook_path_from_json(
            persisted_wf or workflow_json
        )

        # 5. Activate the new instance and wait for webhook registration
        await n8n_svc.activate_n8n_workflow(new_n8n_id)
        await n8n_svc._wait_for_workflow_active(new_n8n_id)

        # 6. Create execution record in DB and store the instance workflow id
        execution = ExecutionService.create_execution(db, execution_data, current_user)
        execution.instance_n8n_workflow_id = new_n8n_id
        db.commit()

        # 7. Trigger the workflow with parameters
        try:
            if resolved_webhook_path:
                # Webhook-based workflow: trigger via webhook URL
                trigger_data = {
                    "keywords": execution_data.keywords,
                    "location": execution_data.location,
                    "execution_id": execution.id,
                    "user_id": current_user.id,
                }
                result = await n8n_svc.trigger_workflow(
                    workflow_id=new_n8n_id,
                    data=trigger_data,
                    webhook_path=resolved_webhook_path,
                )
                execution.status = "running"
                if isinstance(result, dict) and result.get("executionId"):
                    execution.n8n_execution_id = str(result["executionId"])
            else:
                # Schedule-based workflow: activation is the trigger,
                # n8n will execute it on its schedule. Status polling will
                # detect completion via check_running_executions.
                execution.status = "running"
            db.commit()
            db.refresh(execution)
        except Exception as trigger_exc:
            execution_logger.log_error(trigger_exc, "n8n workflow trigger")
            execution.status = "error"
            execution.result = {"error": f"Failed to trigger n8n workflow: {str(trigger_exc)}"}
            db.commit()
            db.refresh(execution)

        execution_logger.log_operation(
            "execution_creation",
            "successful",
            f"execution_id={execution.id}, user_id={current_user.id}, instance_n8n_workflow_id={new_n8n_id}, status={execution.status}"
        )
        return execution
    except Exception as exc:
        execution_logger.log_error(exc, "execution creation")
        raise_workflow_operation_error("Failed to create execution")


@router.post("/check-running", response_model=List[WorkflowExecutionResponse])
async def check_running_executions_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check n8n status for all running/pending executions and return updated list"""
    return await ExecutionService.check_running_executions(db, current_user)


@router.post("/{execution_id}/cancel", response_model=WorkflowExecutionResponse)
async def cancel_execution_endpoint(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an execution"""
    execution = ExecutionService.cancel_execution(db, execution_id, current_user)
    return execution


@router.post("/{execution_id}/deactivate", response_model=WorkflowExecutionResponse)
async def deactivate_execution_endpoint(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate and delete the per-execution n8n workflow instance, mark execution as cancelled"""
    return await ExecutionService.deactivate_execution(db, execution_id, current_user)


@router.post("/{execution_id}/check-status", response_model=WorkflowExecutionResponse)
async def check_execution_status_endpoint(
    execution_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check n8n execution status and update DB if workflow finished"""
    return await ExecutionService.check_execution_status(db, execution_id, current_user)


@router.patch("/{execution_id}/status", response_model=WorkflowExecutionResponse)
async def update_execution_status_endpoint(
    execution_id: int,
    status_update: ExecutionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update execution status (used by webhooks or background tasks)"""
    execution = ExecutionService.update_execution_status(
        db, execution_id, status_update, current_user
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
