### Development & Setup Guide

This guide provides instructions on how to set up and develop for the Automation Platform.

#### Quick Start (Docker)
1. **Prepare Environment**: Create a `.env` file in the root directory (refer to `README.md` for template).
2. **Build & Start**: Run `docker-compose up --build`.
3. **Access Services**:
   - Frontend: `http://localhost:3000` (or `http://localhost:5173`)
   - Backend API: `http://localhost:8000/docs` (Swagger UI)
   - Celery Monitoring (Flower): `http://localhost:5555`

#### Backend Development
- **Setup**: Install dependencies via `pip install -r backend/requirements.txt`.
- **Database Migrations**:
  - Create: `alembic revision --autogenerate -m "description"`
  - Apply: `alembic upgrade head`
- **Running Locally (Non-Docker)**:
  - `uvicorn app.main:app --reload` (FastAPI)
  - `celery -A celery_app worker --loglevel=info` (Worker)
  - `celery -A celery_app beat --loglevel=info` (Scheduler)

#### Frontend Development
- **Setup**: `cd frontend && npm install`
- **Run Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Linting**: `npm run lint`

#### Debugging Tips
- **Logs**: Check backend logs for API and database connection issues.
- **n8n Connectivity**: Verify `N8N_API_URL` and `N8N_API_KEY` in your `.env`.
- **Celery Tasks**: Use Flower (`http://localhost:5555`) to monitor task execution and failures.
- **Database Inspection**: Use `psql` or any DB client to connect to the PostgreSQL instance (default port 5432).

#### Future Development Recommendations
- **Testing**: Implement unit and integration tests in the `backend/tests` and `frontend/tests` directories (currently sparse).
- **Error Handling**: Enhance the `utils/errors.py` to provide more detailed error responses.
- **Monitoring**: Integrate Prometheus or Sentry for production-grade monitoring.
