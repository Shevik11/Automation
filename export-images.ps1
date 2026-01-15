# PowerShell скрипт для експорту Docker образів

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Експорт Docker образів для Automation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Перевірка наявності docker-compose
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "Помилка: docker-compose не знайдено" -ForegroundColor Red
    exit 1
}

# Крок 1: Збірка образів
Write-Host "Крок 1: Збірка Docker образів..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка при збірці образів!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Образі успішно зібрані" -ForegroundColor Green
Write-Host ""

# Крок 2: Отримання назв образів
Write-Host "Крок 2: Отримання назв образів..." -ForegroundColor Yellow
$backendImage = docker images | Select-String "automation_backend" | Select-Object -First 1
$frontendImage = docker images | Select-String "automation_frontend" | Select-Object -First 1

if (-not $backendImage -or -not $frontendImage) {
    Write-Host "Помилка: Не вдалося знайти образи" -ForegroundColor Red
    exit 1
}

$backendName = ($backendImage -split '\s+')[0] + ":" + ($backendImage -split '\s+')[1]
$frontendName = ($frontendImage -split '\s+')[0] + ":" + ($frontendImage -split '\s+')[1]

Write-Host "Backend образ: $backendName" -ForegroundColor Cyan
Write-Host "Frontend образ: $frontendName" -ForegroundColor Cyan
Write-Host ""

# Крок 3: Експорт образів
Write-Host "Крок 3: Експорт образів у файли..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = "automation-images-$timestamp.tar"

docker save $backendName $frontendName -o $outputFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Помилка при експорті образів!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Образі експортовані в $outputFile" -ForegroundColor Green
Write-Host ""

# Крок 4: Інформація про файл
$fileInfo = Get-Item $outputFile
$fileSize = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host "Розмір файлу: $fileSize MB" -ForegroundColor Cyan
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Готово!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для імпорту на іншому пристрої виконайте:" -ForegroundColor Yellow
Write-Host "  docker load -i $outputFile" -ForegroundColor White
Write-Host ""
Write-Host "Потім запустіть:" -ForegroundColor Yellow
Write-Host "  docker-compose up -d" -ForegroundColor White
Write-Host ""

