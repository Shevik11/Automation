### Services Rules & Patterns

#### Overview
Business logic layer sitting between API routes and database models. Each file encapsulates operations for a single domain.

#### Rules
- Two patterns coexist:
  - **Standalone functions**: simple CRUD operations (e.g., `get_workflow_configs_by_user(db, user_id)`).
  - **Service classes with `@staticmethod`**: complex operations grouped logically (e.g., `WorkflowService.create_workflow()`).
- All database operations receive a `db: Session` parameter — services do not create their own sessions.
- Services raise exceptions from `utils/exceptions.py` for error cases (e.g., `raise_workflow_not_found_error()`).
- Services must not import or depend on FastAPI request/response objects directly.
- Use type hints on all function signatures including return types.
- Keep functions focused: one operation per function.
- External API calls (e.g., n8n) are isolated in dedicated service files (e.g., `n8n_service.py`).

#### File Pattern
- One file per domain: `{domain}_service.py` (e.g., `workflow_service.py`, `execution_service.py`).
- Utility services use descriptive names (e.g., `file_service.py`).

#### Naming
- **Files**: `{domain}_service.py` in snake_case.
- **Classes**: `{Domain}Service` in PascalCase.
- **Functions**: verb + object in snake_case (e.g., `get_workflow_config_by_id`, `create_workflow`).
