from urllib.parse import urlparse
from typing import List

from api import auth, celery_status, executions, linkedin_results, presets, workflows
from app.config import settings
from app.database import engine, get_db
from models.user import User
from models.workflow import WorkflowConfig
from models.execution import WorkflowExecution
from models.linkedin_result import LinkedinResult
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text, func
from utils.errors import (
    app_exception_handler,
    create_error_response,
    generic_exception_handler,
    validation_exception_handler,
)
from utils.logger import setup_logging
from utils.workflow_validator import (
    InvalidWorkflowJsonError,
    N8NWorkflowError,
    WorkflowImportError,
)

logger = setup_logging()
logger.info("🔧 API modules imported successfully")

app = FastAPI(
    title="N8N Automation API",
    description="API for managing n8n workflow executions",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
routers = [
    (auth.router, "auth"),
    (workflows.router, "workflows"),
    (presets.router, "presets"),
    (executions.router, "executions"),
    (linkedin_results.router, "linkedin_results"),
    (celery_status.router, "celery_status"),
]

for router, name in routers:
    app.include_router(router, prefix="/api")

logger.info(f"🔧 Registered {len(routers)} API routers successfully")


# Exception handlers
from fastapi.exceptions import RequestValidationError

# Register exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Keep specific workflow exception handlers for backward compatibility
@app.exception_handler(InvalidWorkflowJsonError)
async def invalid_workflow_json_handler(
    request: Request, exc: InvalidWorkflowJsonError
):
    """Handle invalid workflow JSON errors"""
    return create_error_response(
        status.HTTP_400_BAD_REQUEST,
        exc.message,
        "Invalid Workflow JSON",
        {"errors": exc.errors}
    )


@app.exception_handler(WorkflowImportError)
async def workflow_import_error_handler(request: Request, exc: WorkflowImportError):
    """Handle workflow import errors"""
    return create_error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        str(exc),
        "Workflow Import Error"
    )


@app.exception_handler(N8NWorkflowError)
async def n8n_workflow_error_handler(request: Request, exc: N8NWorkflowError):
    """Handle n8n workflow errors"""
    return create_error_response(
        status.HTTP_502_BAD_GATEWAY,
        str(exc),
        "N8N Workflow Error"
    )


@app.get("/")
async def root():
    return {"message": "N8N Automation API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    logger.info(" Starting N8N Automation API...")
    logger.info(" API ready to work!")
