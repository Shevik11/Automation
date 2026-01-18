from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class WorkflowConfigBase(BaseModel):
    workflow_name: str
    n8n_workflow_id: str
    webhook_path: Optional[str] = None
    run_interval_minutes: int = 15  # Default: every 15 minutes


class WorkflowConfigCreate(WorkflowConfigBase):
    workflow_config_json: Optional[Dict[str, Any]] = None
    workflow_version: Optional[str] = None
    is_active: bool = True
    run_interval_minutes: int = 15
    description: Optional[str] = None
    source_file: Optional[str] = None


class WorkflowConfigResponse(WorkflowConfigBase):
    id: int
    user_id: int
    workflow_config_json: Optional[Dict[str, Any]] = None
    workflow_version: Optional[str] = None
    is_active: bool = True
    run_interval_minutes: int = 15
    last_run_at: Optional[datetime] = None
    description: Optional[str] = None
    source_file: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SavedPresetBase(BaseModel):
    preset_name: str
    keywords: str
    location: str
    workflow_config_id: int


class SavedPresetCreate(SavedPresetBase):
    pass


class SavedPresetResponse(SavedPresetBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowJsonExport(BaseModel):
    workflow_json: Dict[str, Any]


class WorkflowFileImport(BaseModel):
    filename: str = "automation.json"


class WorkflowJsonImport(BaseModel):
    workflow_json: Dict[str, Any]
    source_file: Optional[str] = None


class WorkflowActivate(BaseModel):
    is_active: bool


class StaticFilesList(BaseModel):
    files: List[str]
