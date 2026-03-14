# Backend — WNIU Automation

FastAPI 0.128 + Python, PostgreSQL via SQLAlchemy 2.0 ORM, Pydantic 2.7 validation, Alembic migrations, Celery 5.3 + Redis for async tasks.

## Project Layout

```
backend/
├── app/
│   ├── main.py          # App factory, router registration, middleware, exception handlers
│   ├── config.py        # Pydantic Settings (reads from .env)
│   └── database.py      # SQLAlchemy engine + SessionLocal + get_db dependency
├── api/                 # APIRouter handlers — no business logic here
├── models/              # SQLAlchemy ORM models (inherits Base from database.py)
├── schemas/             # Pydantic request/response schemas
├── services/            # Business logic — called by api/ handlers
├── utils/
│   ├── dependencies.py  # get_current_user dependency
│   ├── errors.py        # Standardized error responses
│   ├── exceptions.py    # Custom exception helpers
│   ├── logger.py        # Module loggers (auth_logger, workflow_logger, etc.)
│   ├── security.py      # JWT encode/decode
│   └── workflow_validator.py
├── alembic/             # DB migrations (versions/ + env.py)
├── static/              # Default workflow JSON templates
├── celery_app.py        # Celery app + beat schedule
└── tasks.py             # Celery task definitions
```

## Adding a New Endpoint

1. **Schema** — add Pydantic schema in `schemas/<domain>.py`:
   ```python
   class ThingCreate(BaseModel):
       name: str
       value: int

   class ThingResponse(BaseModel):
       id: int
       name: str
       model_config = ConfigDict(from_attributes=True)
   ```

2. **Model** — add SQLAlchemy model in `models/<domain>.py` (if new table):
   ```python
   class Thing(Base):
       __tablename__ = "things"
       id = Column(Integer, primary_key=True)
       name = Column(String, nullable=False)
   ```

3. **Migration** — generate and apply:
   ```bash
   alembic revision --autogenerate -m "add things table"
   alembic upgrade head
   ```

4. **Service** — add business logic in `services/<domain>_service.py`:
   ```python
   def create_thing(db: Session, data: ThingCreate, user_id: int) -> Thing:
       thing = Thing(**data.model_dump(), user_id=user_id)
       db.add(thing)
       db.commit()
       db.refresh(thing)
       return thing
   ```

5. **Route** — add handler in `api/<domain>.py`:
   ```python
   router = APIRouter(prefix="/things", tags=["things"])

   @router.post("/", response_model=ThingResponse, status_code=201)
   def create(data: ThingCreate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
       return thing_service.create_thing(db, data, current_user.id)
   ```

6. **Register** — include router in `app/main.py`:
   ```python
   from api.things import router as things_router
   app.include_router(things_router, prefix="/api")
   ```

## Auth — Protecting a Route

All protected routes use `Depends(get_current_user)` from `utils/dependencies.py`:

```python
# Protected — requires valid JWT Bearer token
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Public — no auth dependency
@router.post("/register")
def register(data: RegisterData, db: Session = Depends(get_db)):
    ...
```

Auth flow:
1. Client sends `Authorization: Bearer <token>` header.
2. `OAuth2PasswordBearer` extracts token.
3. `get_current_user` validates JWT via `utils/security.py`, loads user from DB.
4. 401 raised if token invalid/expired.

Rate limiting on auth endpoints: `@limiter.limit("10/minute")`.

## Database Access

- Session injected via `Depends(get_db)` — never create sessions manually in handlers.
- All queries in service layer, not in route handlers.
- Use SQLAlchemy 2.0 style (`db.execute(select(...))`) in new code; legacy `db.query()` still present in existing services.

```python
# Good — query in service
def get_workflow(db: Session, workflow_id: int, user_id: int) -> WorkflowConfig | None:
    return db.query(WorkflowConfig).filter_by(id=workflow_id, user_id=user_id).first()

# Bad — query in route handler
@router.get("/{id}")
def get(id: int, db: Session = Depends(get_db)):
    return db.query(WorkflowConfig).filter_by(id=id).first()  # no!
```

## Error Handling

Use `utils/exceptions.py` helpers which raise `HTTPException`:

```python
from utils.exceptions import raise_not_found, raise_forbidden, raise_bad_request

def get_workflow_or_404(db, workflow_id, user_id):
    workflow = workflow_service.get_workflow(db, workflow_id, user_id)
    if not workflow:
        raise_not_found("Workflow not found")
    return workflow
```

Error response shape (from `utils/errors.py`):
```json
{ "error": "not_found", "message": "Workflow not found", "details": {} }
```

Global exception handlers registered in `app/main.py` catch `RequestValidationError` and unhandled exceptions.

## Validation

Pydantic 2.7 schemas validate all request bodies automatically. For manual validation:

```python
# Field constraints inline
class WorkflowCreate(BaseModel):
    workflow_name: str = Field(..., min_length=1, max_length=255)
    run_interval_minutes: int = Field(default=15, ge=1, le=1440)
```

Response schemas must include `model_config = ConfigDict(from_attributes=True)` to serialize ORM objects.

## Logging

Use module-level loggers from `utils/logger.py`:

```python
from utils.logger import workflow_logger

workflow_logger.log_operation("create_workflow", user_id=user_id, workflow_id=obj.id)
workflow_logger.log_error("create_workflow", error=e, user_id=user_id)
```

Available loggers: `auth_logger`, `workflow_logger`, `execution_logger`, `linkedin_logger`, `database_logger`.
Do **not** use `print()` — use the appropriate domain logger.

## Configuration

All settings via `app/config.py` (Pydantic BaseSettings, reads `.env`):

```python
from app.config import settings

n8n_url = settings.N8N_API_URL   # correct
n8n_url = os.environ["N8N_API_URL"]  # avoid
```

## Celery Tasks

Define tasks in `tasks.py`, import `celery_app` from `celery_app.py`:

```python
@celery_app.task
def my_task(arg: int) -> dict:
    ...
```

Schedule periodic tasks in `celery_app.py` beat schedule. Don't add long-running logic directly in task body — call service functions.

## Patterns

**Route → Service separation:**
```python
# Before — business logic in route
@router.post("/")
def create(data: WorkflowCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    w = WorkflowConfig(**data.model_dump(), user_id=user.id)
    db.add(w); db.commit(); db.refresh(w)
    return w

# After — delegate to service
@router.post("/", response_model=WorkflowResponse, status_code=201)
def create(data: WorkflowCreate, db=Depends(get_db), user=Depends(get_current_user)):
    return workflow_service.create_workflow(db, data, user.id)
```

**Schema with ORM compat:**
```python
# Before — missing ORM config
class WorkflowResponse(BaseModel):
    id: int; name: str

# After
class WorkflowResponse(BaseModel):
    id: int; name: str
    model_config = ConfigDict(from_attributes=True)
```

**Exception helpers:**
```python
# Before — inline HTTPException
raise HTTPException(status_code=404, detail="Not found")

# After — use helpers
from utils.exceptions import raise_not_found
raise_not_found("Workflow not found")
```

**Config access:**
```python
# Before
import os; url = os.getenv("N8N_API_URL")

# After
from app.config import settings; url = settings.N8N_API_URL
```

**Logging:**
```python
# Before
print(f"User {user_id} created workflow")

# After
workflow_logger.log_user_action("create_workflow", user_id=user_id)
```

## Never Do

- Never put DB queries in `api/` route handlers — always in `services/`.
- Never hardcode secrets, URLs, or config values — use `settings`.
- Never alter the DB schema directly — create an Alembic migration.
- Never use `print()` for logging — use the domain loggers.
- Never call N8N or external HTTP from route handlers — use `n8n_service.py`.
