from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class WorkflowExecutionBase(BaseModel):
    workflow_config_id: Optional[int] = (
        None  # Optional - will use default if not provided
    )
    keywords: str  # JSON або текст
    location: str
    save_as_preset: bool = False  # Save parameters as preset after execution
    preset_name: Optional[str] = None  # Name for the preset if saving


class WorkflowExecutionCreate(WorkflowExecutionBase):
    pass


class WorkflowExecutionResponse(BaseModel):
    id: int
    user_id: int
    workflow_config_id: int  # Always present in response
    keywords: str
    location: str
    n8n_execution_id: Optional[str] = None
    status: str  # pending/running/success/error
    result: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExecutionStatusUpdate(BaseModel):
    status: str
    result: Optional[dict] = None
    n8n_execution_id: Optional[str] = None


class ExecutionDataRow(BaseModel):
    """
    Simplified view of data that was saved for a particular execution
    Used for endpoints that return 'business data' instead of full execution metadata
    """

    execution_id: int
    workflow_config_id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    data: Dict[str, Any]
    source: str = "database"

    class Config:
        from_attributes = True
