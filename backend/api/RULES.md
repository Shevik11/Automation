### API Routes Rules & Patterns

#### Overview
FastAPI router modules defining HTTP endpoints. Each file groups routes for a single domain.

#### Rules
- Each file creates an `APIRouter` with a `prefix` and `tags` list (e.g., `APIRouter(prefix="/workflows", tags=["workflows"])`).
- Use dependency injection for authentication (`Depends(get_current_user)`) and database sessions (`Depends(get_db)`).
- Route handlers are `async def` functions with descriptive docstrings.
- Delegate all business logic to the `services/` layer — route handlers should only validate input, call services, and return responses.
- Use `response_model` on all routes for automatic serialization.
- Use explicit `status_code` for non-200 responses (e.g., `status.HTTP_201_CREATED`, `status.HTTP_204_NO_CONTENT`).
- Catch broad exceptions only at the route level; log with `logger.exception()` and raise `HTTPException`.
- Re-raise `HTTPException` instances from services without wrapping.

#### URL Pattern
- Collection endpoints: `""` (GET list, POST create).
- Item endpoints: `"/{item_id}"` (GET, PUT, DELETE).
- Action endpoints: `"/{item_id}/action"` (PATCH, POST).
- Special endpoints before parameterized routes: `"/active"`, `"/default"`, `"/static-files"`.

#### File Pattern
- One file per domain (e.g., `workflows.py`, `executions.py`, `auth.py`).
- Routers are registered in `app/main.py` via `app.include_router()`.

#### Naming
- **Files**: plural lowercase (e.g., `workflows.py`, `linkedin_results.py`).
- **Route functions**: verb + noun (e.g., `get_workflows`, `create_workflow`, `delete_workflow`).
