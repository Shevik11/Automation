### Utils Rules & Patterns

#### Overview
Shared utility modules used across the backend: authentication, error handling, logging, and validation.

#### Modules
- `dependencies.py` — FastAPI dependency functions (e.g., `get_current_user`).
- `security.py` — Token creation and verification (JWT).
- `exceptions.py` — Custom exception helper functions (e.g., `raise_workflow_not_found_error`).
- `errors.py` — Error response models or constants.
- `logger.py` — Logging configuration.
- `workflow_validator.py` — Workflow JSON validation and sanitization.

#### Rules
- Exception helpers follow the pattern `raise_{entity}_{error_type}_error()` and raise `HTTPException` internally.
- Validators raise custom exception classes (e.g., `InvalidWorkflowJsonError`, `WorkflowImportError`).
- Dependencies are designed for FastAPI's `Depends()` injection system.
- Utils must not import from `api/` or `services/` to avoid circular dependencies.
- Keep each utility focused on a single concern.
