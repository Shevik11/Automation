### Backend Rules & Patterns

#### Technology Stack
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy with Alembic migrations
- **Validation**: Pydantic schemas
- **Task Queue**: Celery with Redis broker
- **Database**: PostgreSQL

#### Project Structure
```
backend/
├── app/           # Application core (config, database, main entrypoint)
├── api/           # FastAPI route handlers (routers)
├── models/        # SQLAlchemy ORM models
├── schemas/       # Pydantic request/response schemas
├── services/      # Business logic layer
├── utils/         # Shared utilities (auth, errors, logging, validation)
├── alembic/       # Database migration scripts
├── static/        # Static JSON files (workflow templates)
├── celery_app.py  # Celery application setup
├── tasks.py       # Celery task definitions
└── init_db.py     # Database initialization script
```

#### General Rules
- All modules must expose their public API through `__init__.py` with explicit `__all__` exports.
- Use Python type hints on all function signatures.
- Use `logging.getLogger(__name__)` for module-level logging.
- Configuration is loaded from environment variables via `app/config.py`.
- Database sessions are managed via FastAPI's `Depends(get_db)` dependency injection.

#### Naming Conventions
- **Files**: lowercase with underscores (e.g., `workflow_service.py`, `linkedin_result.py`).
- **Classes**: PascalCase (e.g., `WorkflowConfig`, `WorkflowService`).
- **Functions**: snake_case (e.g., `get_workflow_configs_by_user`).
- **Database tables**: plural snake_case (e.g., `workflow_configs`, `saved_presets`).

#### Error Handling
- Use custom exception helper functions from `utils/exceptions.py` (e.g., `raise_workflow_not_found_error`).
- HTTP exceptions should use FastAPI's `HTTPException` with appropriate status codes.
- Catch broad exceptions only at the API layer; re-raise `HTTPException` instances.
- Log exceptions with `logger.exception()` before raising HTTP errors.

#### Import Order
1. Standard library imports
2. Third-party imports (FastAPI, SQLAlchemy, Pydantic)
3. Local application imports (app, models, schemas, services, utils)
