### Backend Architecture: FastAPI & PostgreSQL

The backend is a robust FastAPI application responsible for API serving, database management via SQLAlchemy ORM, and background task scheduling with Celery.

#### Core Components
- **FastAPI Application (`backend/app/main.py`)**: Entry point for all API requests, configures CORS, rate limiting, and exception handlers.
- **Database Layer (`backend/app/database.py`)**: Uses SQLAlchemy with PostgreSQL. Migrations are managed by Alembic.
- **API Routers (`backend/api/`)**:
  - `auth.py`: User registration, login, and Google OAuth integration.
  - `workflows.py`: CRUD operations for workflow configurations.
  - `executions.py`: Triggering and tracking workflow executions.
  - `presets.py`: Managing reusable workflow parameters.
  - `linkedin_results.py`: Specific API for storing and retrieving LinkedIn-specific automation data.
  - `celery_status.py`: Monitoring task queue health.

#### Data Models (`backend/models/`)
- `User`: Handles account information and authentication credentials.
- `WorkflowConfig`: Defines the parameters for n8n workflows (n8n_id, intervals, webhook paths).
- `WorkflowExecution`: Tracks individual runs of a workflow, including status and timestamps.
- `LinkedinResult`: Specialized storage for LinkedIn-based automation data (profiles, search results).
- `Preset`: Stores reusable keyword and location combinations for workflows.

#### Task Queue (`backend/celery_app.py`, `backend/tasks.py`)
- **Celery**: Handles asynchronous processing using Redis as a broker.
- **Beat Schedule**: A recurring task runs every 15 minutes to check which workflows are due for execution based on their `run_interval_minutes`.
- **Tasks**: `check_and_trigger_n8n_workflows` is the main background task responsible for automated execution.

#### Configuration (`backend/app/config.py`)
- Uses Pydantic's `BaseSettings` for type-safe environment variable management (DATABASE_URL, N8N_API_KEY, SECRET_KEY).
