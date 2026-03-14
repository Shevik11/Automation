"""
Centralized logging utilities for the application.
Provides consistent logging across all modules.
"""
import logging
import sys
from typing import Optional


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Setup application-wide logging configuration"""

    # Configure root logger
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Get application logger
    logger = logging.getLogger("automation_app")
    logger.setLevel(level)

    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a specific module"""
    return logging.getLogger(f"automation_app.{name}")


class AppLogger:
    """Application logger with common logging patterns"""

    def __init__(self, name: str):
        self.logger = get_logger(name)

    def log_request(self, method: str, path: str, user_id: Optional[int] = None):
        """Log API request"""
        user_info = f" (User: {user_id})" if user_id else ""
        self.logger.info(f"{method} {path}{user_info}")

    def log_auth_attempt(self, email: str, success: bool = True):
        """Log authentication attempt"""
        level = logging.INFO if success else logging.WARNING
        status = "successful" if success else "failed"
        self.logger.log(level, f"Login {status} for: {self._mask_email(email)}")

    def log_user_action(self, user_id: int, action: str, details: Optional[str] = None):
        """Log user action"""
        message = f"User {user_id} {action}"
        if details:
            message += f": {details}"
        self.logger.info(message)

    def log_operation(self, operation: str, status: str, details: Optional[str] = None):
        """Log operation result"""
        message = f"{operation} {status}"
        if details:
            message += f": {details}"

        if status.lower() in ["failed", "error"]:
            self.logger.error(message)
        else:
            self.logger.info(message)

    def log_error(self, error: Exception, context: Optional[str] = None):
        """Log error with context"""
        message = f"Error occurred"
        if context:
            message += f" in {context}"
        message += f": {str(error)}"

        self.logger.error(message)
        self.logger.debug(f"Full error: {error}", exc_info=True)

    def _mask_email(self, email: str) -> str:
        """Mask email for logging"""
        if "@" not in email:
            return "***@***"
        username, domain = email.split("@", 1)
        if len(username) <= 2:
            masked_username = "*" * len(username)
        else:
            masked_username = username[0] + "*" * (len(username) - 2) + username[-1]
        return f"{masked_username}@{domain}"


# Common logger instances
auth_logger = AppLogger("auth")
workflow_logger = AppLogger("workflow")
execution_logger = AppLogger("execution")
linkedin_logger = AppLogger("linkedin")
database_logger = AppLogger("database")
