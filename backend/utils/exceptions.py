"""
Error handling utilities for the application.
Provides simple functions to raise standardized HTTP exceptions.
"""
from fastapi import HTTPException, status
from typing import Optional, Any


# Authentication & Authorization
def raise_authentication_error(detail: str = "Incorrect email or password"):
    """Raise authentication error (401)"""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"}
    )


def raise_authorization_error(detail: str = "Not authorized"):
    """Raise authorization error (403)"""
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def raise_user_not_found_error(detail: str = "User not found"):
    """Raise user not found error (404)"""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


# Resource Errors
def raise_resource_not_found_error(resource_type: str = "Resource", resource_id: Optional[Any] = None):
    """Raise resource not found error (404)"""
    detail = f"{resource_type} not found"
    if resource_id:
        detail += f" (ID: {resource_id})"
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def raise_workflow_not_found_error(workflow_id: Optional[int] = None):
    """Raise workflow not found error (404)"""
    raise_resource_not_found_error("Workflow", workflow_id)


def raise_execution_not_found_error(execution_id: Optional[int] = None):
    """Raise execution not found error (404)"""
    raise_resource_not_found_error("Execution", execution_id)


def raise_preset_not_found_error(preset_id: Optional[int] = None):
    """Raise preset not found error (404)"""
    raise_resource_not_found_error("Preset", preset_id)


# Validation & Business Logic
def raise_validation_error(detail: str):
    """Raise validation error (400)"""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def raise_duplicate_resource_error(detail: str = "Resource already exists"):
    """Raise duplicate resource error (409)"""
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def raise_user_already_exists_error(email: Optional[str] = None):
    """Raise user already exists error (409)"""
    detail = "Email already registered"
    if email:
        detail += f": {email}"
    raise_duplicate_resource_error(detail)


# File & Import Operations
def raise_file_operation_error(detail: str):
    """Raise file operation error (500)"""
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


def raise_import_error(detail: str):
    """Raise import error (400)"""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def raise_workflow_import_error(detail: str = "Failed to import workflow"):
    """Raise workflow import error (400)"""
    raise_import_error(detail)


# Export Operations
def raise_export_error(detail: str = "Export failed"):
    """Raise export error (500)"""
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


def raise_unsupported_format_error(format_type: str, supported: list):
    """Raise unsupported format error (400)"""
    detail = f"Unsupported {format_type} format. Supported: {', '.join(supported)}"
    raise_validation_error(detail)


# Service & Infrastructure
def raise_service_unavailable_error(service: str = "service"):
    """Raise service unavailable error (503)"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"{service} temporarily unavailable"
    )


def raise_database_error(detail: str = "Database operation failed"):
    """Raise database error (500)"""
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


# Registration
def raise_registration_error(detail: str = "Registration failed"):
    """Raise registration error (400)"""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


# Workflow Operations
def raise_workflow_operation_error(detail: str):
    """Raise workflow operation error (500)"""
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


def raise_default_workflow_creation_error(detail: str = "Failed to create default workflow. Please try again or contact support."):
    """Raise default workflow creation error (500)"""
    raise_workflow_operation_error(detail)


# Preset Operations
def raise_preset_operation_error(detail: str):
    """Raise preset operation error (500)"""
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
