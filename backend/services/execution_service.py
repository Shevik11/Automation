import io
import csv
from typing import List
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from models.execution import WorkflowExecution
from models.user import User
from schemas.execution import ExecutionStatusUpdate, WorkflowExecutionCreate
from services.execution_service import (
    cancel_execution,
    create_execution,
    get_execution_by_id,
    get_executions_by_user,
    update_execution_status,
)
from sqlalchemy.orm import Session
from utils.exceptions import raise_execution_not_found_error


class ExecutionService:
    """Service class for execution operations"""

    @staticmethod
    def get_user_executions(db: Session, user: User) -> List[WorkflowExecution]:
        """Get all executions for a user"""
        return get_executions_by_user(db, user.id)

    @staticmethod
    def get_execution_by_id(db: Session, execution_id: int, user: User) -> WorkflowExecution:
        """Get execution by ID for user"""
        execution = get_execution_by_id(db, execution_id, user.id)
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
        executions = get_executions_by_user(db, user.id)
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
    def create_execution(db: Session, execution_data: dict, user: User) -> WorkflowExecution:
        """Create a new execution"""
        create_data = WorkflowExecutionCreate(**execution_data)
        return create_execution(db, user, create_data)

    @staticmethod
    def cancel_execution(db: Session, execution_id: int, user: User) -> bool:
        """Cancel an execution"""
        success = cancel_execution(db, execution_id, user.id)
        if not success:
            raise_execution_not_found_error(execution_id)
        return success

    @staticmethod
    def update_execution_status(db: Session, execution_id: int, status_update: dict, user: User) -> WorkflowExecution:
        """Update execution status"""
        update_data = ExecutionStatusUpdate(**status_update)
        execution = update_execution_status(db, execution_id, user.id, update_data)
        if not execution:
            raise_execution_not_found_error(execution_id)
        return execution