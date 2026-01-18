"""
Standard error responses and handlers.
Provides consistent error handling patterns.
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
# AppException no longer needed - using functions instead
from utils.logger import get_logger
import logging

logger = get_logger("errors")


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.error(f"Validation error for {request.url.path}: {exc.errors()}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "details": exc.errors(),
            "message": "Invalid request data"
        },
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        f"Unexpected error on {request.url.path}: {str(exc)}",
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        },
    )


def create_error_response(
    status_code: int,
    message: str,
    error_type: str = "Error",
    details: dict = None
) -> JSONResponse:
    """Create a standardized error response"""
    content = {
        "error": error_type,
        "message": message
    }

    if details:
        content["details"] = details

    return JSONResponse(
        status_code=status_code,
        content=content
    )


# Common error responses
def not_found_response(resource: str = "Resource") -> JSONResponse:
    """404 Not Found response"""
    return create_error_response(
        status.HTTP_404_NOT_FOUND,
        f"{resource} not found",
        "Not Found"
    )


def unauthorized_response(message: str = "Not authorized") -> JSONResponse:
    """401 Unauthorized response"""
    return create_error_response(
        status.HTTP_401_UNAUTHORIZED,
        message,
        "Unauthorized"
    )


def forbidden_response(message: str = "Forbidden") -> JSONResponse:
    """403 Forbidden response"""
    return create_error_response(
        status.HTTP_403_FORBIDDEN,
        message,
        "Forbidden"
    )


def bad_request_response(message: str = "Bad request") -> JSONResponse:
    """400 Bad Request response"""
    return create_error_response(
        status.HTTP_400_BAD_REQUEST,
        message,
        "Bad Request"
    )


def conflict_response(message: str = "Resource conflict") -> JSONResponse:
    """409 Conflict response"""
    return create_error_response(
        status.HTTP_409_CONFLICT,
        message,
        "Conflict"
    )


def internal_error_response(message: str = "Internal server error") -> JSONResponse:
    """500 Internal Server Error response"""
    return create_error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        message,
        "Internal Server Error"
    )
