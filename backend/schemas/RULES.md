### Schemas Rules & Patterns

#### Overview
Pydantic models for request validation and response serialization. Each file corresponds to a domain entity.

#### Rules
- All schemas inherit from `pydantic.BaseModel`.
- Follow the Base → Create → Response inheritance pattern:
  - `*Base`: shared fields between create and response.
  - `*Create`: extends Base with fields needed for creation (can be a pass-through).
  - `*Response`: extends Base with read-only fields (`id`, `user_id`, `created_at`).
- Response schemas must include `class Config: from_attributes = True` for ORM compatibility.
- Use `Optional[T] = None` for nullable/optional fields.
- Use sensible defaults where applicable (e.g., `run_interval_minutes: int = 15`).
- One-off request/response schemas (e.g., `WorkflowActivate`, `WorkflowDuplicate`) are simple flat models in the same domain file.

#### File Pattern
- One file per domain entity (e.g., `workflow.py`, `execution.py`, `auth.py`).
- Register all schemas in `__init__.py`.

#### Naming
- **Schema classes**: PascalCase with suffix indicating purpose (e.g., `WorkflowConfigCreate`, `SavedPresetResponse`).
- **Files**: lowercase matching the domain entity (e.g., `workflow.py`, `linkedin.py`).
