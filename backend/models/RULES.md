### Models Rules & Patterns

#### Overview
SQLAlchemy ORM models representing database tables. Each file defines one or more related models.

#### Rules
- All models inherit from `Base` (imported from `app.database`).
- Define `__tablename__` as plural snake_case (e.g., `workflow_configs`, `users`).
- Use `Column()` with explicit `nullable`, `index`, and `default` parameters.
- Primary keys use `Column(Integer, primary_key=True, index=True)`.
- Foreign keys must specify `ondelete` behavior (e.g., `ondelete="CASCADE"`).
- Timestamp columns use `DateTime(timezone=True)` with `server_default=func.now()`.
- Define relationships with `relationship()` and set `cascade` on parent side (e.g., `cascade="all, delete-orphan"`).
- Use `back_populates` (not `backref`) for bidirectional relationships.
- Table-level constraints go in `__table_args__` tuple.

#### File Pattern
- One domain entity per file (e.g., `user.py`, `workflow.py`, `execution.py`).
- Register all models in `__init__.py` with explicit `__all__` list.

#### Naming
- **Model classes**: PascalCase singular (e.g., `User`, `WorkflowConfig`, `LinkedinResult`).
- **Table names**: plural snake_case (e.g., `users`, `workflow_configs`).
- **Columns**: snake_case (e.g., `user_id`, `created_at`, `is_active`).
