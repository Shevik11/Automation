### Project Overview: Automation Platform

This project is a sophisticated automation platform that bridges a FastAPI backend with n8n workflow automation, providing a user-friendly React frontend to manage, trigger, and monitor automated tasks.

#### Key Features
- **Workflow Management**: Create, edit, and trigger n8n workflows through a unified interface.
- **Scheduled Executions**: Celery-based scheduler that triggers active workflows every 15 minutes.
- **Result Tracking**: Persistent storage for workflow execution results, specifically optimized for LinkedIn lead generation data.
- **Presets System**: Save and reuse successful configurations for different workflows.
- **Authentication**: Secure user access with Google Auth support.

#### High-Level Architecture
- **Frontend**: React (TypeScript, Vite) - Single-page application for user interaction.
- **Backend**: FastAPI (Python) - RESTful API serving the frontend and managing the database.
- **Task Queue**: Celery (Redis) - Asynchronous task processing and periodic scheduling.
- **Workflow Engine**: n8n - External workflow automation platform triggered via webhooks.
- **Database**: PostgreSQL (SQLAlchemy/Alembic) - Stores users, workflows, executions, and results.
- **Infrastructure**: Docker Compose - Containerized deployment for all components.

#### Project Structure
- `backend/`: FastAPI application code, models, and Celery tasks.
- `frontend/`: React source code, components, and services.
- `docker-compose.yml`: Defines the multi-container environment.
- `README.md`: Basic setup and troubleshooting information.
