# WNIU Automation

LinkedIn workflow automation platform: trigger N8N workflows, track executions, and collect LinkedIn scrape results via a React frontend and FastAPI backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.2, TypeScript 5.9, Vite 7.2, Chakra UI 2.8, React Router 7.9, Axios |
| Backend | FastAPI 0.128, Python, SQLAlchemy 2.0, Pydantic 2.7, Alembic |
| Auth | JWT (python-jose + bcrypt), Bearer token |
| Task Queue | Celery 5.3 + Redis 7 (worker + beat + Flower) |
| Database | PostgreSQL |
| Integration | N8N (external workflow engine via REST API + webhooks) |
| Infra | Docker Compose (6 services) |

## Project Structure

```
/
├── docker-compose.yml        # All 6 services
├── .env                      # Root env (used by Docker)
├── backend/
│   ├── app/                  # FastAPI app entry, config, database
│   ├── api/                  # Route handlers (APIRouter per domain)
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/             # Business logic
│   ├── utils/                # Shared: deps, errors, logger, security
│   ├── alembic/              # DB migrations
│   ├── static/               # Default workflow JSON files
│   ├── celery_app.py         # Celery setup
│   └── tasks.py              # Celery task definitions
└── frontend/
    └── src/
        ├── components/       # UI components by domain
        ├── context/          # React Context (AuthContext)
        ├── hooks/            # Custom hooks
        ├── pages/            # Page-level components
        ├── services/         # Axios API calls
        ├── types/            # All TypeScript interfaces
        └── utils/            # Storage, date helpers
```

## Running Locally

```bash
# Full stack via Docker
docker compose up --build

# Backend only (dev)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend only (dev)
cd frontend
npm install
npm run dev          # Vite dev server on :3000, proxies /api → :8000

# DB migrations
cd backend
alembic upgrade head

# Celery worker (separate terminal)
cd backend
celery -A celery_app.celery_app worker --loglevel=info

# Celery beat (separate terminal)
cd backend
celery -A celery_app.celery_app beat --loglevel=info
```

## Environment Variables

`.env` at root (Docker reads this). `backend/.env` for local backend dev.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT algorithm (HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry (30) |
| `N8N_API_URL` | N8N instance base URL |
| `N8N_API_KEY` | N8N API authentication key |
| `N8N_WEBHOOK_URL` | N8N webhook trigger URL |
| `N8N_PROJECT_ID` | N8N project identifier |
| `N8N_FOLDER_ID` | N8N folder identifier |
| `CELERY_BROKER_URL` | Redis URL (default: `redis://redis:6379/0`) |
| `CELERY_RESULT_BACKEND` | Redis URL for results |
| `FLOWER_BASIC_AUTH` | Flower UI auth (`user:pass`) |

## Branch & Commit Conventions

- Main branch: `main` (production-ready)
- Feature/fix work on named branches, merge via PR
- Commit style: `<type>: <description>` — e.g. `fix: handle null workflow id`, `feat: add preset duplication`

## Cross-Cutting Rules

- **Shared types**: Frontend types live in `frontend/src/types/index.ts`. Backend schemas in `backend/schemas/`.
- **API contract**: All endpoints prefixed `/api/`. See `backend/app/main.py` for router registration.
- **Naming**: `PascalCase` for classes and React components; `snake_case` for Python functions/variables; `camelCase` for TypeScript functions/variables.
- **No business logic in route handlers** — routes call services, services do the work.
- **No direct DB access from routes** — always go through service layer.
- **No direct Axios calls in React components** — use `services/workflow.service.ts` or `services/auth.service.ts`.
- **All protected backend routes** require `Depends(get_current_user)`.

## Never Do

- Don't put DB queries in `api/` route handlers — use `services/`.
- Don't hardcode secrets or URLs — always use `settings` from `app/config.py`.
- Don't add new env vars without updating both `.env` files and `docker-compose.yml`.
- Don't bypass Alembic — never manually alter DB schema; create a migration.
- Don't call N8N directly from route handlers — use `n8n_service.py`.
