import io
import csv
import logging
from typing import List, Optional
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from datetime import datetime

logger = logging.getLogger(__name__)

from models.execution import WorkflowExecution
from models.user import User
from schemas.execution import ExecutionStatusUpdate, WorkflowExecutionCreate
from sqlalchemy.orm import Session
from utils.exceptions import raise_execution_not_found_error
from services.n8n_service import N8NService
import asyncio


class ExecutionService:
    """Service class for execution operations"""

    @staticmethod
    def get_user_executions(
        db: Session,
        user: User,
        limit: int = 50,
        offset: int = 0,
        workflow_config_id: Optional[int] = None,
    ) -> List[WorkflowExecution]:
        """Get executions for a user with pagination and optional workflow_config_id filter"""
        query = db.query(WorkflowExecution).filter(WorkflowExecution.user_id == user.id)
        if workflow_config_id is not None:
            query = query.filter(WorkflowExecution.workflow_config_id == workflow_config_id)
        return (
            query
            .order_by(WorkflowExecution.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_execution_by_id(db: Session, execution_id: int, user: User) -> WorkflowExecution:
        """Get execution by ID for user, raises 404 if not found"""
        execution = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.user_id == user.id,
            )
            .first()
        )
        if not execution:
            raise_execution_not_found_error(execution_id)
        return execution

    @staticmethod
    def export_executions_csv(db: Session, user: User) -> StreamingResponse:
        """Export executions as CSV for user"""
        executions = ExecutionService.get_user_executions(db, user)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "id",
            "workflow_config_id",
            "status",
            "keywords",
            "location",
            "n8n_execution_id",
            "created_at",
            "completed_at",
        ])

        for execution in executions:
            writer.writerow([
                execution.id,
                execution.workflow_config_id,
                execution.status,
                execution.keywords,
                execution.location,
                execution.n8n_execution_id or "",
                execution.created_at.isoformat() if execution.created_at else "",
                execution.completed_at.isoformat() if execution.completed_at else "",
            ])

        output.seek(0)
        headers = {"Content-Disposition": 'attachment; filename="executions.csv"'}
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers=headers,
        )

    @staticmethod
    def get_execution_data(db: Session, user: User) -> List[dict]:
        """Get execution data rows for user"""
        executions = ExecutionService.get_user_executions(db, user)
        return [
            {
                "id": ex.id,
                "workflow_config_id": ex.workflow_config_id,
                "status": ex.status,
                "keywords": ex.keywords,
                "location": ex.location,
                "n8n_execution_id": ex.n8n_execution_id,
                "created_at": ex.created_at.isoformat() if ex.created_at else None,
                "completed_at": ex.completed_at.isoformat() if ex.completed_at else None,
            }
            for ex in executions
        ]

    @staticmethod
    def create_execution(db: Session, execution_data: WorkflowExecutionCreate, user: User) -> WorkflowExecution:
        """Create a new execution"""
        execution = WorkflowExecution(
            user_id=user.id,
            workflow_config_id=execution_data.workflow_config_id,
            keywords=execution_data.keywords,
            location=execution_data.location,
            status="pending"
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)
        return execution

    @staticmethod
    def cancel_execution(db: Session, execution_id: int, user: User) -> WorkflowExecution:
        """Cancel an execution, raises 404 if not found"""
        execution = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.user_id == user.id,
            )
            .first()
        )
        if not execution:
            raise_execution_not_found_error(execution_id)
        if execution.n8n_execution_id:
            n8n_service = N8NService()
            success = asyncio.run(n8n_service.cancel_execution(execution.n8n_execution_id))
            if success:
                execution.status = "cancelled"
                execution.completed_at = datetime.utcnow()
                db.commit()
        return execution

    @staticmethod
    async def deactivate_execution(db: Session, execution_id: int, user: User) -> WorkflowExecution:
        """Deactivate and delete the per-execution n8n workflow instance, mark execution as cancelled"""
        execution = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.user_id == user.id,
            )
            .first()
        )
        if not execution:
            raise_execution_not_found_error(execution_id)
        if execution.instance_n8n_workflow_id:
            n8n_svc = N8NService()
            await n8n_svc.deactivate_n8n_workflow(execution.instance_n8n_workflow_id)
            await n8n_svc.delete_workflow(execution.instance_n8n_workflow_id)
        execution.status = "cancelled"
        execution.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(execution)
        return execution

    @staticmethod
    async def _cleanup_n8n_workflow(execution: WorkflowExecution) -> None:
        """Deactivate and delete the per-execution n8n workflow instance after it finishes."""
        if not execution.instance_n8n_workflow_id:
            return
        try:
            n8n_svc = N8NService()
            logger.info("Cleaning up n8n workflow %s for execution %s (status=%s)",
                        execution.instance_n8n_workflow_id, execution.id, execution.status)
            await n8n_svc.deactivate_n8n_workflow(execution.instance_n8n_workflow_id)
            await n8n_svc.delete_workflow(execution.instance_n8n_workflow_id)
            logger.info("Successfully deleted n8n workflow %s", execution.instance_n8n_workflow_id)
        except Exception as e:
            logger.warning("Failed to cleanup n8n workflow %s: %s",
                           execution.instance_n8n_workflow_id, str(e))

    @staticmethod
    async def check_execution_status(db: Session, execution_id: int, user: User) -> WorkflowExecution:
        """Check n8n execution status and update DB if workflow finished."""
        execution = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.user_id == user.id,
            )
            .first()
        )
        if not execution:
            raise_execution_not_found_error(execution_id)

        # Only check running/pending executions
        if execution.status not in ("running", "pending"):
            return execution

        n8n_svc = N8NService()

        # Strategy 1: Check by n8n_execution_id if available
        if execution.n8n_execution_id:
            n8n_status = await n8n_svc.get_execution_status(execution.n8n_execution_id)
            if n8n_status:
                finished = n8n_status.get("finished", False)
                status_val = n8n_status.get("status", "")
                if finished or status_val in ("success", "error", "crashed", "warning"):
                    if status_val in ("success", "warning"):
                        execution.status = "success"
                        execution.result = {"message": "Workflow completed successfully", "n8n_status": status_val}
                    else:
                        execution.status = "error"
                        error_msg = n8n_status.get("data", {}).get("resultData", {}).get("error", {}).get("message", "Workflow failed") if isinstance(n8n_status.get("data"), dict) else "Workflow failed"
                        execution.result = {"error": error_msg, "n8n_status": status_val}
                    execution.completed_at = datetime.utcnow()
                    db.commit()
                    db.refresh(execution)
                    await ExecutionService._cleanup_n8n_workflow(execution)
                    return execution

        # Strategy 2: Check n8n executions list for the instance workflow
        if execution.instance_n8n_workflow_id:
            n8n_execs = await n8n_svc.get_n8n_executions_for_workflow(execution.instance_n8n_workflow_id)
            for n8n_exec in n8n_execs:
                finished = n8n_exec.get("finished", False)
                status_val = n8n_exec.get("status", "")
                if finished or status_val in ("success", "error", "crashed", "warning"):
                    if status_val in ("success", "warning"):
                        execution.status = "success"
                        execution.result = {"message": "Workflow completed successfully", "n8n_status": status_val}
                    else:
                        execution.status = "error"
                        error_msg = n8n_exec.get("data", {}).get("resultData", {}).get("error", {}).get("message", "Workflow failed") if isinstance(n8n_exec.get("data"), dict) else "Workflow failed"
                        execution.result = {"error": error_msg, "n8n_status": status_val}
                    # Store the n8n execution id if we didn't have it
                    if not execution.n8n_execution_id and n8n_exec.get("id"):
                        execution.n8n_execution_id = str(n8n_exec["id"])
                    execution.completed_at = datetime.utcnow()
                    db.commit()
                    db.refresh(execution)
                    await ExecutionService._cleanup_n8n_workflow(execution)
                    return execution

            # Strategy 3: Check if the n8n workflow itself still exists/is active
            workflow_info = await n8n_svc.get_workflow(execution.instance_n8n_workflow_id)
            if workflow_info is None:
                # Workflow was deleted from n8n — mark as error
                execution.status = "error"
                execution.result = {"error": "n8n workflow no longer exists — it may have been deleted externally"}
                execution.completed_at = datetime.utcnow()
                db.commit()
                db.refresh(execution)
                return execution

        return execution

    @staticmethod
    async def check_running_executions(db: Session, user: User) -> List[WorkflowExecution]:
        """Check n8n status for all running/pending executions and update DB."""
        running = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.user_id == user.id,
                WorkflowExecution.status.in_(("running", "pending")),
            )
            .all()
        )
        if not running:
            return []

        n8n_svc = N8NService()
        updated = []
        for execution in running:
            try:
                changed = False
                # Strategy 1: Check by n8n_execution_id
                if execution.n8n_execution_id:
                    n8n_status = await n8n_svc.get_execution_status(execution.n8n_execution_id)
                    if n8n_status:
                        finished = n8n_status.get("finished", False)
                        status_val = n8n_status.get("status", "")
                        if finished or status_val in ("success", "error", "crashed", "warning"):
                            if status_val in ("success", "warning"):
                                execution.status = "success"
                                execution.result = {"message": "Workflow completed successfully", "n8n_status": status_val}
                            else:
                                execution.status = "error"
                                error_msg = n8n_status.get("data", {}).get("resultData", {}).get("error", {}).get("message", "Workflow failed") if isinstance(n8n_status.get("data"), dict) else "Workflow failed"
                                execution.result = {"error": error_msg, "n8n_status": status_val}
                            execution.completed_at = datetime.utcnow()
                            changed = True

                # Strategy 2: Check executions list for instance workflow
                if not changed and execution.instance_n8n_workflow_id:
                    n8n_execs = await n8n_svc.get_n8n_executions_for_workflow(execution.instance_n8n_workflow_id)
                    for n8n_exec in n8n_execs:
                        finished = n8n_exec.get("finished", False)
                        status_val = n8n_exec.get("status", "")
                        if finished or status_val in ("success", "error", "crashed", "warning"):
                            if status_val in ("success", "warning"):
                                execution.status = "success"
                                execution.result = {"message": "Workflow completed successfully", "n8n_status": status_val}
                            else:
                                execution.status = "error"
                                error_msg = n8n_exec.get("data", {}).get("resultData", {}).get("error", {}).get("message", "Workflow failed") if isinstance(n8n_exec.get("data"), dict) else "Workflow failed"
                                execution.result = {"error": error_msg, "n8n_status": status_val}
                            if not execution.n8n_execution_id and n8n_exec.get("id"):
                                execution.n8n_execution_id = str(n8n_exec["id"])
                            execution.completed_at = datetime.utcnow()
                            changed = True
                            break

                if changed:
                    updated.append(execution)
            except Exception:
                pass  # Skip individual failures, continue checking others

        if updated:
            db.commit()
            for ex in updated:
                db.refresh(ex)
                await ExecutionService._cleanup_n8n_workflow(ex)

        return running

    @staticmethod
    def update_execution_status(db: Session, execution_id: int, status_update: ExecutionStatusUpdate, user: User) -> WorkflowExecution:
        """Update execution status, raises 404 if not found"""
        execution = (
            db.query(WorkflowExecution)
            .filter(
                WorkflowExecution.id == execution_id,
                WorkflowExecution.user_id == user.id,
            )
            .first()
        )
        if not execution:
            raise_execution_not_found_error(execution_id)
        execution.status = status_update.status
        if status_update.result:
            execution.result = status_update.result
        if status_update.n8n_execution_id:
            execution.n8n_execution_id = status_update.n8n_execution_id
        if status_update.status in ["success", "error", "cancelled"]:
            execution.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(execution)
        return execution
