# N8N Automation Platform

MVP платформа для запуску n8n автоматизацій через веб-інтерфейс.

## Технології

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Автентифікація**: JWT
- **Інтеграція**: N8N API
- **Docker**: Повна докеризація проекту

## Швидкий старт з Docker

### Production

1. Скопіюйте `.env.example` в `.env` та налаштуйте змінні:
```bash
cp .env.example .env
# Відредагуйте .env файл
```

2. Запустіть всі сервіси:
```bash
docker-compose up -d
```

3. Перевірте статус:
```bash
docker-compose ps
```

4. Доступ до сервісів:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development

Для розробки з hot-reload:
```bash
docker-compose -f docker-compose.dev.yml up
```

## Ручне налаштування (без Docker)

### Backend

1. Встановіть залежності:
```bash
cd backend
pip install -r requirements.txt
```

2. Створіть файл `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost/automation_db
SECRET_KEY=your-secret-key-min-32-chars
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
```

3. Створіть базу даних та застосуйте міграції:
```bash
# Створіть базу даних PostgreSQL
createdb automation_db

# Застосуйте міграції
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

4. Запустіть сервер:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

1. Встановіть залежності:
```bash
cd frontend
npm install
```

2. Запустіть dev сервер:
```bash
npm run dev
```

## Структура проекту

```
.
├── backend/          # FastAPI backend
│   ├── api/         # API endpoints
│   ├── models/      # SQLAlchemy models
│   ├── schemas/     # Pydantic schemas
│   ├── services/    # Business logic
│   └── utils/       # Utilities
├── frontend/        # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   └── nginx.conf   # Nginx config for production
├── docker-compose.yml        # Production Docker Compose
├── docker-compose.dev.yml    # Development Docker Compose
└── .env.example              # Environment variables example
```

## Використання

1. **Реєстрація/Логін**: Створіть акаунт або увійдіть
2. **Створення Workflow Config**: Додайте конфігурацію n8n workflow (ID або webhook path)
3. **Створення Preset** (опціонально): Збережіть часто використовувані параметри
4. **Запуск Execution**: Виберіть workflow, введіть keywords, frequency, location та запустіть

## API Endpoints

### Auth
- `POST /api/auth/register` - Реєстрація
- `POST /api/auth/login` - Логін
- `GET /api/auth/me` - Поточний користувач

### Workflows
- `GET /api/workflows` - Список workflow configs
- `POST /api/workflows` - Створити workflow config
- `GET /api/workflows/presets` - Список presets
- `POST /api/workflows/presets` - Створити preset

### Executions
- `GET /api/executions` - Список executions
- `POST /api/executions` - Створити execution (запускає n8n)
- `GET /api/executions/{id}` - Деталі execution
- `POST /api/executions/{id}/cancel` - Скасувати execution

## База даних

### Таблиці:
- `users` - Користувачі
- `workflow_configs` - Конфігурації n8n workflows
- `workflow_executions` - Виконання workflows
- `saved_presets` - Збережені пресети для швидкого запуску

## Docker команди

```bash
# Запустити всі сервіси
docker-compose up -d

# Зупинити всі сервіси
docker-compose down

# Переглянути логи
docker-compose logs -f

# Перебудувати образи
docker-compose build --no-cache

# Видалити volumes (очистити БД)
docker-compose down -v

# Запустити міграції вручну
docker-compose exec backend alembic upgrade head
```

## N8N Інтеграція

Backend відправляє JSON до n8n з наступними полями:
```json
{
  "keywords": "keyword1, keyword2",
  "frequency": "daily",
  "location": "Ukraine, Kyiv",
  "execution_id": "123"
}
```

N8N workflow повинен приймати ці дані через webhook або API.

**Важливо**: Якщо n8n запущений на хост-машині, використовуйте `host.docker.internal` в `N8N_API_URL` для доступу з Docker контейнера.

## Примітки

- Для production змініть `SECRET_KEY` на безпечний випадковий ключ
- Налаштуйте CORS для production
- Додайте rate limiting та інші заходи безпеки
- Для production використовуйте окремі .env файли та не комітьте їх в git
