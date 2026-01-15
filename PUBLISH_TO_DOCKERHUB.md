# Публікація образів на Docker Hub

## Крок 1: Реєстрація на Docker Hub

1. Перейдіть на https://hub.docker.com
2. Створіть безкоштовний акаунт
3. Підтвердіть email

## Крок 2: Авторизація

```bash
docker login
```

Введіть ваш Docker Hub username та password.

## Крок 3: Публікація образів

### Windows (PowerShell):

```powershell
.\publish-images.ps1 -DockerHubUsername "ваш-username"
```

### Linux/Mac:

```bash
# Спочатку зберіть образи
docker-compose build

# Тегуйте образи
docker tag automation_backend:latest ваш-username/automation-backend:latest
docker tag automation_frontend:latest ваш-username/automation-frontend:latest

# Публікуйте
docker push ваш-username/automation-backend:latest
docker push ваш-username/automation-frontend:latest
```

## Крок 4: Використання на іншому пристрої

### Варіант 1: Оновіть docker-compose.yml

Замініть секції `build:` на `image:`:

```yaml
backend:
  image: ваш-username/automation-backend:latest
  # ... решта конфігурації

frontend:
  image: ваш-username/automation-frontend:latest
  # ... решта конфігурації
```

### Варіант 2: Використайте docker-compose.prod.yml

1. Відкрийте `docker-compose.prod.yml`
2. Замініть `YOUR_DOCKERHUB_USERNAME` на ваш username
3. Запустіть:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Варіант 3: Просто docker pull

```bash
docker pull ваш-username/automation-backend:latest
docker pull ваш-username/automation-frontend:latest
docker-compose up -d
```

## Переваги цього підходу:

✅ Не потрібно переносити великі .tar файли  
✅ Автоматичні оновлення через `docker pull`  
✅ Легше розподіляти між командою  
✅ Версіонування через теги (latest, v1.0, v1.1, тощо)  

## Публікація нової версії:

```bash
# З новим тегом
.\publish-images.ps1 -DockerHubUsername "ваш-username" -Tag "v1.0"

# Або оновити latest
.\publish-images.ps1 -DockerHubUsername "ваш-username" -Tag "latest"
```

## Приватні репозиторії:

Якщо потрібні приватні образи (платно на Docker Hub, або використайте інші реєстри):
- GitHub Container Registry (ghcr.io) - безкоштовно
- GitLab Container Registry
- AWS ECR
- Azure Container Registry

