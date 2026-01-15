# PowerShell скрипт для публікації Docker образів на Docker Hub

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername,
    
    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Публікація Docker образів на Docker Hub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Перевірка авторизації
Write-Host "Перевірка авторизації Docker Hub..." -ForegroundColor Yellow
docker info | Select-String "Username" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Потрібна авторизація в Docker Hub" -ForegroundColor Yellow
    Write-Host "Виконайте: docker login" -ForegroundColor Yellow
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Помилка авторизації!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Авторизовано" -ForegroundColor Green
Write-Host ""

# Крок 1: Збірка образів
Write-Host "Крок 1: Збірка Docker образів..." -ForegroundColor Yellow
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка при збірці образів!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Образі успішно зібрані" -ForegroundColor Green
Write-Host ""

# Крок 2: Пошук та тегування образів
Write-Host "Крок 2: Пошук та тегування образів..." -ForegroundColor Yellow

# Знаходимо образи автоматично
$backendImageName = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "automation.*backend" | Select-Object -First 1
$frontendImageName = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "automation.*frontend" | Select-Object -First 1

if (-not $backendImageName -or -not $frontendImageName) {
    Write-Host "Помилка: Не вдалося знайти образи!" -ForegroundColor Red
    Write-Host "Доступні образи:" -ForegroundColor Yellow
    docker images | Select-String "automation"
    exit 1
}

$backendImage = "${DockerHubUsername}/automation-backend:$Tag"
$frontendImage = "${DockerHubUsername}/automation-frontend:$Tag"

Write-Host "Знайдено backend образ: $backendImageName" -ForegroundColor Cyan
Write-Host "Знайдено frontend образ: $frontendImageName" -ForegroundColor Cyan
Write-Host ""

docker tag $backendImageName $backendImage
docker tag $frontendImageName $frontendImage

Write-Host "Backend образ: $backendImage" -ForegroundColor Cyan
Write-Host "Frontend образ: $frontendImage" -ForegroundColor Cyan
Write-Host ""

# Крок 3: Публікація образів
Write-Host "Крок 3: Публікація образів на Docker Hub..." -ForegroundColor Yellow
Write-Host "Це може зайняти деякий час..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Завантаження backend образу..." -ForegroundColor Yellow
docker push $backendImage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка при публікації backend образу!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Backend образ опубліковано" -ForegroundColor Green
Write-Host ""

Write-Host "Завантаження frontend образу..." -ForegroundColor Yellow
docker push $frontendImage

if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка при публікації frontend образу!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Frontend образ опубліковано" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Готово! Образі опубліковані" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для використання на іншому пристрої:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Оновіть docker-compose.yml:" -ForegroundColor Cyan
Write-Host "   Замініть 'build:' на 'image: ${DockerHubUsername}/automation-backend:$Tag'" -ForegroundColor White
Write-Host "   Замініть 'build:' на 'image: ${DockerHubUsername}/automation-frontend:$Tag'" -ForegroundColor White
Write-Host ""
Write-Host "2. Або виконайте:" -ForegroundColor Cyan
Write-Host "   docker pull ${DockerHubUsername}/automation-backend:$Tag" -ForegroundColor White
Write-Host "   docker pull ${DockerHubUsername}/automation-frontend:$Tag" -ForegroundColor White
Write-Host ""
Write-Host "3. Запустіть:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""

