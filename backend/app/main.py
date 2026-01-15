from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from api import auth, workflows, executions, celery_status, linkedin_results
from utils.workflow_validator import (
    InvalidWorkflowJsonError,
    WorkflowImportError,
    N8NWorkflowError
)
import logging
import sys

# Configure logging to output to console
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

app = FastAPI(
    title="N8N Automation API",
    description="API for managing n8n workflow executions",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Vite dev server
        "http://localhost:5173",  # Vite default port
        "http://localhost:80",    # Production nginx
        "http://localhost",       # Production nginx (no port)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(executions.router, prefix="/api")
app.include_router(linkedin_results.router, prefix="/api")
app.include_router(celery_status.router, prefix="/api")


# Exception handlers
from fastapi.exceptions import RequestValidationError

logger = logging.getLogger(__name__)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.error(f"Validation error for {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "details": exc.errors()
        }
    )


@app.exception_handler(InvalidWorkflowJsonError)
async def invalid_workflow_json_handler(request: Request, exc: InvalidWorkflowJsonError):
    """Handle invalid workflow JSON errors"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Invalid Workflow JSON",
            "message": exc.message,
            "errors": exc.errors
        }
    )


@app.exception_handler(WorkflowImportError)
async def workflow_import_error_handler(request: Request, exc: WorkflowImportError):
    """Handle workflow import errors"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Workflow Import Error",
            "message": str(exc)
        }
    )


@app.exception_handler(N8NWorkflowError)
async def n8n_workflow_error_handler(request: Request, exc: N8NWorkflowError):
    """Handle n8n workflow errors"""
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "N8N Workflow Error",
            "message": str(exc)
        }
    )


@app.get("/")
async def root():
    return {"message": "N8N Automation API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

