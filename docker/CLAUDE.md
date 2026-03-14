# Infrastructure / Docker — WNIU Automation

Docker Compose orchestrates all 6 services. No CI/CD pipeline currently configured.

## Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `backend` | Custom (./backend/Dockerfile) | 8000 | FastAPI app |
| `frontend` | Custom (./frontend/Dockerfile) | 3000→80 | React SPA via Nginx |
| `redis` | redis:7-alpine | 6379 | Celery broker + result backend |
| `celery_worker` | Same as backend | — | Processes async tasks |
| `celery_beat` | Same as backend | — | Periodic task scheduler |
| `flower` | Same as backend | 5555 | Celery task monitoring UI |

## Running the Stack

```bash
# Build and start all services
docker compose up --build

# Start without rebuilding
docker compose up

# Start specific service
docker compose up backend redis

# View logs
docker compose logs -f backend
docker compose logs -f celery_worker

# Restart single service
docker compose restart backend

# Stop everything
docker compose down

# Stop and remove volumes (resets DB)
docker compose down -v
```

## Adding a New Environment Variable

1. Add to root `.env`:
   ```
   MY_NEW_VAR=value
   ```

2. Add to `docker-compose.yml` under every service that needs it:
   ```yaml
   services:
     backend:
       environment:
         MY_NEW_VAR: ${MY_NEW_VAR}
     celery_worker:
       environment:
         MY_NEW_VAR: ${MY_NEW_VAR}
   ```

3. Add to `backend/app/config.py` Settings class:
   ```python
   my_new_var: str = Field(..., env="MY_NEW_VAR")
   ```

4. Access in code via `settings.my_new_var`.

5. Update `backend/.env` for local dev (non-Docker).

## Deployment

- **No automated CI/CD** currently configured.
- Deploy by pulling the repo on the target host and running `docker compose up --build -d`.
- Ensure `.env` is present at the project root on the target host (not committed to git).
- Run DB migrations after deploy:
  ```bash
  docker compose exec backend alembic upgrade head
  ```

## Secrets Management

- Secrets are in `.env` (gitignored) — never commit this file.
- Docker Compose reads root `.env` via `env_file: - .env`.
- `SECRET_KEY`: JWT signing secret — must be long, random, unique per environment.
- `N8N_API_KEY`: N8N instance API key.
- `FLOWER_BASIC_AUTH`: Flower UI login (default `admin:admin` — change in production).
- For production: use a secrets manager (e.g. AWS Secrets Manager, Vault) or Docker secrets instead of plain `.env`.

## Health Checks

```yaml
# Backend: HTTP check
test: ["CMD", "curl", "-f", "http://localhost:8000/health"]

# Redis: CLI ping
test: ["CMD", "redis-cli", "ping"]
```

Celery worker and beat depend on `redis` being `service_healthy` before starting.

## Patterns

**Rebuild only one service:**
```bash
# Before — rebuild everything
docker compose up --build

# After — rebuild only what changed
docker compose up --build backend
```

**Run DB migration inside container:**
```bash
docker compose exec backend alembic upgrade head
```

**Check Celery tasks via Flower:**
```
http://localhost:5555
# Auth: FLOWER_BASIC_AUTH value from .env
```

**Tail specific service logs:**
```bash
docker compose logs -f celery_worker --tail=100
```

## Never Do

- Never commit `.env` to git — it contains secrets.
- Never change `FLOWER_BASIC_AUTH` to a weak password in production.
- Never add a new config value only to `.env` — also add it to `docker-compose.yml` environment block and `config.py`.
- Never run `docker compose down -v` in production — it destroys the database volume.
- Never skip `alembic upgrade head` after a deploy that includes model changes.
