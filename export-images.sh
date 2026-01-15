#!/bin/bash

echo "=========================================="
echo "Експорт Docker образів для Automation"
echo "=========================================="
echo ""

# Перевірка наявності docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "Помилка: docker-compose не знайдено"
    exit 1
fi

# Крок 1: Збірка образів
echo "Крок 1: Збірка Docker образів..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "Помилка при збірці образів!"
    exit 1
fi

echo "✓ Образі успішно зібрані"
echo ""

# Крок 2: Отримання назв образів
echo "Крок 2: Отримання назв образів..."
BACKEND_IMAGE=$(docker images | grep automation_backend | awk '{print $1":"$2}' | head -1)
FRONTEND_IMAGE=$(docker images | grep automation_frontend | awk '{print $1":"$2}' | head -1)

if [ -z "$BACKEND_IMAGE" ] || [ -z "$FRONTEND_IMAGE" ]; then
    echo "Помилка: Не вдалося знайти образи"
    echo "Backend: $BACKEND_IMAGE"
    echo "Frontend: $FRONTEND_IMAGE"
    exit 1
fi

echo "Backend образ: $BACKEND_IMAGE"
echo "Frontend образ: $FRONTEND_IMAGE"
echo ""

# Крок 3: Експорт образів
echo "Крок 3: Експорт образів у файли..."
OUTPUT_FILE="automation-images-$(date +%Y%m%d-%H%M%S).tar"

docker save $BACKEND_IMAGE $FRONTEND_IMAGE -o $OUTPUT_FILE

if [ $? -ne 0 ]; then
    echo "Помилка при експорті образів!"
    exit 1
fi

echo "✓ Образі експортовані в $OUTPUT_FILE"
echo ""

# Крок 4: Стиснення (опціонально)
echo "Крок 4: Стиснення файлу..."
gzip -f $OUTPUT_FILE
COMPRESSED_FILE="${OUTPUT_FILE}.gz"

if [ $? -eq 0 ]; then
    echo "✓ Файл стиснуто: $COMPRESSED_FILE"
    FILE_SIZE=$(ls -lh $COMPRESSED_FILE | awk '{print $5}')
    echo "Розмір файлу: $FILE_SIZE"
else
    echo "⚠ Стиснення не вдалося, але файл створено: $OUTPUT_FILE"
    FILE_SIZE=$(ls -lh $OUTPUT_FILE | awk '{print $5}')
    echo "Розмір файлу: $FILE_SIZE"
fi

echo ""
echo "=========================================="
echo "Готово!"
echo "=========================================="
echo ""
echo "Для імпорту на іншому пристрої виконайте:"
if [ -f "$COMPRESSED_FILE" ]; then
    echo "  gunzip $COMPRESSED_FILE"
    echo "  docker load -i $OUTPUT_FILE"
else
    echo "  docker load -i $OUTPUT_FILE"
fi
echo ""
echo "Потім запустіть:"
echo "  docker-compose up -d"
echo ""

