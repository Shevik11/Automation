#!/bin/bash

# Bash скрипт для публікації Docker образів на Docker Hub

if [ -z "$1" ]; then
    echo "Використання: ./publish-images.sh <DockerHubUsername> [tag]"
    echo "Приклад: ./publish-images.sh myusername latest"
    exit 1
fi

DOCKERHUB_USERNAME=$1
TAG=${2:-latest}

echo "=========================================="
echo "Публікація Docker образів на Docker Hub"
echo "=========================================="
echo ""

# Перевірка авторизації
echo "Перевірка авторизації Docker Hub..."
if ! docker info | grep -q "Username"; then
    echo "Потрібна авторизація в Docker Hub"
    echo "Виконайте: docker login"
    docker login
    if [ $? -ne 0 ]; then
        echo "Помилка авторизації!"
        exit 1
    fi
fi

echo "✓ Авторизовано"
echo ""

# Крок 1: Збірка образів
echo "Крок 1: Збірка Docker образів..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "Помилка при збірці образів!"
    exit 1
fi

echo "✓ Образі успішно зібрані"
echo ""

# Крок 2: Пошук та тегування образів
echo "Крок 2: Пошук та тегування образів..."

# Знаходимо образи автоматично
BACKEND_IMAGE_NAME=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -i "automation.*backend" | head -1)
FRONTEND_IMAGE_NAME=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -i "automation.*frontend" | head -1)

if [ -z "$BACKEND_IMAGE_NAME" ] || [ -z "$FRONTEND_IMAGE_NAME" ]; then
    echo "Помилка: Не вдалося знайти образи!"
    echo "Доступні образи:"
    docker images | grep automation
    exit 1
fi

BACKEND_IMAGE="${DOCKERHUB_USERNAME}/automation-backend:${TAG}"
FRONTEND_IMAGE="${DOCKERHUB_USERNAME}/automation-frontend:${TAG}"

echo "Знайдено backend образ: $BACKEND_IMAGE_NAME"
echo "Знайдено frontend образ: $FRONTEND_IMAGE_NAME"
echo ""

docker tag $BACKEND_IMAGE_NAME $BACKEND_IMAGE
docker tag $FRONTEND_IMAGE_NAME $FRONTEND_IMAGE

echo "Backend образ: $BACKEND_IMAGE"
echo "Frontend образ: $FRONTEND_IMAGE"
echo ""

# Крок 3: Публікація образів
echo "Крок 3: Публікація образів на Docker Hub..."
echo "Це може зайняти деякий час..."
echo ""

echo "Завантаження backend образу..."
docker push $BACKEND_IMAGE

if [ $? -ne 0 ]; then
    echo "Помилка при публікації backend образу!"
    exit 1
fi

echo "✓ Backend образ опубліковано"
echo ""

echo "Завантаження frontend образу..."
docker push $FRONTEND_IMAGE

if [ $? -ne 0 ]; then
    echo "Помилка при публікації frontend образу!"
    exit 1
fi

echo "✓ Frontend образ опубліковано"
echo ""

echo "=========================================="
echo "Готово! Образі опубліковані"
echo "=========================================="
echo ""
echo "Для використання на іншому пристрої:"
echo ""
echo "1. Оновіть docker-compose.yml:"
echo "   Замініть 'build:' на 'image: ${DOCKERHUB_USERNAME}/automation-backend:${TAG}'"
echo "   Замініть 'build:' на 'image: ${DOCKERHUB_USERNAME}/automation-frontend:${TAG}'"
echo ""
echo "2. Або використайте docker-compose.prod.yml (після заміни YOUR_DOCKERHUB_USERNAME)"
echo ""
echo "3. Або виконайте:"
echo "   docker pull ${DOCKERHUB_USERNAME}/automation-backend:${TAG}"
echo "   docker pull ${DOCKERHUB_USERNAME}/automation-frontend:${TAG}"
echo ""
echo "4. Запустіть:"
echo "   docker-compose up -d"
echo ""

