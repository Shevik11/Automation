# Інструкція зі збірки та експорту Docker образів

## Крок 1: Збірка образів

З кореневої директорії проекту виконайте:

```bash
docker-compose build
```

Або збірка окремих сервісів:

```bash
# Backend
docker build -t automation-backend:latest ./backend

# Frontend
docker build -t automation-frontend:latest ./frontend
```

## Крок 2: Експорт образів у файли

### Варіант 1: Експорт через docker-compose (рекомендовано)

```bash
# Зберегти всі образи в один tar файл
docker save automation_backend automation_frontend postgres:15-alpine -o automation-images.tar

# Або окремо для кожного образу
docker save automation_backend -o automation-backend.tar
docker save automation_frontend -o automation-frontend.tar
```

### Варіант 2: Експорт через docker save з тегами

```bash
# Спочатку перевірте назви образів
docker images | grep automation

# Експортуйте образи
docker save automation-backend:latest -o automation-backend.tar
docker save automation-frontend:latest -o automation-frontend.tar
```

## Крок 3: Перенесення на інший пристрій

1. Скопіюйте файли `.tar` на інший пристрій
2. Також скопіюйте:
   - `docker-compose.yml`
   - `.env` файл (якщо є)
   - Папку `static/` з `automation.json` (якщо потрібно)

## Крок 4: Імпорт та запуск на іншому пристрої

### На іншому пристрої:

```bash
# Завантажити образи
docker load -i automation-backend.tar
docker load -i automation-frontend.tar

# Або якщо один файл
docker load -i automation-images.tar

# Перейменувати образи (якщо потрібно)
docker tag automation-backend:latest automation_backend:latest
docker tag automation-frontend:latest automation_frontend:latest

# Запустити через docker-compose
docker-compose up -d
```

## Альтернативний варіант: Використання Docker Registry

Якщо у вас є доступ до Docker Registry (Docker Hub, GitHub Container Registry, тощо):

```bash
# Тегувати образи
docker tag automation-backend:latest your-registry/automation-backend:latest
docker tag automation-frontend:latest your-registry/automation-frontend:latest

# Завантажити на registry
docker push your-registry/automation-backend:latest
docker push your-registry/automation-frontend:latest

# На іншому пристрої
docker pull your-registry/automation-backend:latest
docker pull your-registry/automation-frontend:latest
```

## Швидкий скрипт для експорту

Створіть файл `export-images.sh`:

```bash
#!/bin/bash

echo "Будую образи..."
docker-compose build

echo "Експортую образи..."
docker save automation_backend automation_frontend -o automation-images.tar

echo "Готово! Файл automation-images.tar створено."
echo "Розмір файлу:"
ls -lh automation-images.tar
```

Запустіть:
```bash
chmod +x export-images.sh
./export-images.sh
```

## Важливо!

1. **.env файл**: Переконайтеся, що на іншому пристрої є `.env` файл з правильними налаштуваннями
2. **Порти**: Перевірте, що порти 3000, 8000, 5432 вільні
3. **База даних**: PostgreSQL створиться автоматично при першому запуску
4. **Міграції**: Виконаються автоматично при старті backend

