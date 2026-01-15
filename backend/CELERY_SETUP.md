# Celery Setup для автоматичного запуску n8n workflows

## Опис

Celery task запускається кожні 15 хвилин і:
1. Перевіряє всі активні workflows (`is_active = true`)
2. Якщо 0 workflows - нічого не робить
3. Якщо 1 workflow - запускає його
4. Якщо >1 workflows - проходить циклом по всіх
5. Записує результати в БД через `create_execution`

## Запуск

```bash
# Запустити всі сервіси (включаючи Redis, Celery Worker, Celery Beat)
docker-compose up -d

# Перевірити логи Celery Worker
docker-compose logs -f celery_worker

# Перевірити логи Celery Beat
docker-compose logs -f celery_beat
```

## Перевірка статусу Celery

### 1. Через API endpoint

```bash
# Перевірити статус Celery та Redis
curl http://localhost:8000/api/celery/status \
  -H "Authorization: Bearer <your_token>"

# Переглянути активні задачі
curl http://localhost:8000/api/celery/tasks \
  -H "Authorization: Bearer <your_token>"
```

### 2. Через Flower (Web UI) 🌸

Flower - веб-інтерфейс для моніторингу Celery. Доступний за адресою:
- **URL**: http://localhost:5555
- **Що показує:**
  - ✅ Активні задачі (Active Tasks)
  - ✅ Зареєстровані задачі (Registered Tasks)
  - ✅ Історію виконання (Task History)
  - ✅ Статистику по workers (Workers)
  - ✅ Графіки продуктивності (Monitor)
  - ✅ Деталі кожної задачі (Task Details)
  - ✅ Можливість перезапустити/скасувати задачі

**Як використовувати:**
1. Запустити: `docker-compose up -d flower`
2. Відкрити в браузері: http://localhost:5555
3. Переглянути всі активні та завершені задачі
4. Можна фільтрувати по статусу, worker, часу виконання

**Приклад використання:**
- Переглянути чи задача `check_and_trigger_n8n_workflows` виконується
- Подивитись скільки задач виконано за день
- Перевірити чи є помилки в задачах

### 3. Через Docker команди

```bash
# Перевірити чи контейнери запущені
docker-compose ps

# Перевірити логи Redis
docker-compose logs redis

# Перевірити чи Redis працює
docker-compose exec redis redis-cli ping
# Має повернути: PONG

# Перевірити чи Celery Worker працює
docker-compose exec celery_worker celery -A celery_app.celery_app inspect active

# Перевірити зареєстровані задачі
docker-compose exec celery_worker celery -A celery_app.celery_app inspect registered
```

### 4. Через Python в контейнері

```bash
# Перевірити статус через Python
docker-compose exec backend python -c "
from celery_app import celery_app
inspect = celery_app.control.inspect()
print('Active workers:', inspect.active())
print('Registered tasks:', inspect.registered())
"
```

## Ручний запуск задачі (для тестування)

```bash
# Через API
curl -X POST http://localhost:8000/api/executions/trigger-celery-task \
  -H "Authorization: Bearer <your_token>"

# Або через Python в контейнері
docker-compose exec backend python -c "from tasks import check_and_trigger_n8n_workflows; check_and_trigger_n8n_workflows()"
```

## Налаштування

Частоту запуску можна змінити в `backend/celery_app.py`:

```python
celery_app.conf.beat_schedule = {
    "check-and-trigger-n8n-every-15-min": {
        "task": "tasks.check_and_trigger_n8n_workflows",
        "schedule": 15 * 60.0,  # Змінити на потрібний інтервал (в секундах)
    },
}
```

## Логи

Всі логи зберігаються в контейнерах. Перевірити:

```bash
docker-compose logs celery_worker
docker-compose logs celery_beat
docker-compose logs flower
```

## Troubleshooting

### Celery Worker не запускається
1. Перевір чи Redis працює: `docker-compose logs redis`
2. Перевір змінні оточення: `docker-compose exec celery_worker env | grep CELERY`
3. Перевір логи: `docker-compose logs celery_worker`

### Задачі не виконуються
1. Перевір чи Beat запущений: `docker-compose ps celery_beat`
2. Перевір чи Worker зареєстрований: `docker-compose exec celery_worker celery -A celery_app.celery_app inspect registered`
3. Перевір логи Beat: `docker-compose logs celery_beat`

