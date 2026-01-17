# PowerShell ╤Б╨║╤А╨╕╨┐╤В ╨┤╨╗╤П ╨┐╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤Ч Docker ╨╛╨▒╤А╨░╨╖╤Ц╨▓ ╨╜╨░ Docker Hub

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername,

    [Parameter(Mandatory=$false)]
    [string]$Tag = "latest"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "╨Я╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤П Docker ╨╛╨▒╤А╨░╨╖╤Ц╨▓ ╨╜╨░ Docker Hub" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# ╨Я╨╡╤А╨╡╨▓╤Ц╤А╨║╨░ ╨░╨▓╤В╨╛╤А╨╕╨╖╨░╤Ж╤Ц╤Ч
Write-Host "╨Я╨╡╤А╨╡╨▓╤Ц╤А╨║╨░ ╨░╨▓╤В╨╛╤А╨╕╨╖╨░╤Ж╤Ц╤Ч Docker Hub..." -ForegroundColor Yellow
docker info | Select-String "Username" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "╨Я╨╛╤В╤А╤Ц╨▒╨╜╨░ ╨░╨▓╤В╨╛╤А╨╕╨╖╨░╤Ж╤Ц╤П ╨▓ Docker Hub" -ForegroundColor Yellow
    Write-Host "╨Т╨╕╨║╨╛╨╜╨░╨╣╤В╨╡: docker login" -ForegroundColor Yellow
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨░╨▓╤В╨╛╤А╨╕╨╖╨░╤Ж╤Ц╤Ч!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "тЬУ ╨Р╨▓╤В╨╛╤А╨╕╨╖╨╛╨▓╨░╨╜╨╛" -ForegroundColor Green
Write-Host ""

# ╨Ъ╤А╨╛╨║ 1: ╨Ч╨▒╤Ц╤А╨║╨░ ╨╛╨▒╤А╨░╨╖╤Ц╨▓
Write-Host "╨Ъ╤А╨╛╨║ 1: ╨Ч╨▒╤Ц╤А╨║╨░ Docker ╨╛╨▒╤А╨░╨╖╤Ц╨▓..." -ForegroundColor Yellow
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨┐╤А╨╕ ╨╖╨▒╤Ц╤А╤Ж╤Ц ╨╛╨▒╤А╨░╨╖╤Ц╨▓!" -ForegroundColor Red
    exit 1
}

Write-Host "тЬУ ╨Ю╨▒╤А╨░╨╖╤Ц ╤Г╤Б╨┐╤Ц╤И╨╜╨╛ ╨╖╤Ц╨▒╤А╨░╨╜╤Ц" -ForegroundColor Green
Write-Host ""

# ╨Ъ╤А╨╛╨║ 2: ╨Я╨╛╤И╤Г╨║ ╤В╨░ ╤В╨╡╨│╤Г╨▓╨░╨╜╨╜╤П ╨╛╨▒╤А╨░╨╖╤Ц╨▓
Write-Host "╨Ъ╤А╨╛╨║ 2: ╨Я╨╛╤И╤Г╨║ ╤В╨░ ╤В╨╡╨│╤Г╨▓╨░╨╜╨╜╤П ╨╛╨▒╤А╨░╨╖╤Ц╨▓..." -ForegroundColor Yellow

# ╨Ч╨╜╨░╤Е╨╛╨┤╨╕╨╝╨╛ ╨╛╨▒╤А╨░╨╖╨╕ ╨░╨▓╤В╨╛╨╝╨░╤В╨╕╤З╨╜╨╛
$backendImageName = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "automation.*backend" | Select-Object -First 1 | ForEach-Object { $_.Line.Trim() }
$frontendImageName = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "automation.*frontend" | Select-Object -First 1 | ForEach-Object { $_.Line.Trim() }

if (-not $backendImageName -or -not $frontendImageName) {
    Write-Host "╨Я╨╛╨╝╨╕╨╗╨║╨░: ╨Э╨╡ ╨▓╨┤╨░╨╗╨╛╤Б╤П ╨╖╨╜╨░╨╣╤В╨╕ ╨╛╨▒╤А╨░╨╖╨╕!" -ForegroundColor Red
    Write-Host "╨Ф╨╛╤Б╤В╤Г╨┐╨╜╤Ц ╨╛╨▒╤А╨░╨╖╨╕:" -ForegroundColor Yellow
    docker images | Select-String "automation"
    exit 1
}

$backendImage = "${DockerHubUsername}/automation-backend:$Tag"
$frontendImage = "${DockerHubUsername}/automation-frontend:$Tag"

Write-Host "╨Ч╨╜╨░╨╣╨┤╨╡╨╜╨╛ backend ╨╛╨▒╤А╨░╨╖: $backendImageName" -ForegroundColor Cyan
Write-Host "╨Ч╨╜╨░╨╣╨┤╨╡╨╜╨╛ frontend ╨╛╨▒╤А╨░╨╖: $frontendImageName" -ForegroundColor Cyan
Write-Host ""

docker tag $backendImageName $backendImage
docker tag $frontendImageName $frontendImage

Write-Host "Backend ╨╛╨▒╤А╨░╨╖: $backendImage" -ForegroundColor Cyan
Write-Host "Frontend ╨╛╨▒╤А╨░╨╖: $frontendImage" -ForegroundColor Cyan
Write-Host ""

# ╨Ъ╤А╨╛╨║ 3: ╨Я╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤П ╨╛╨▒╤А╨░╨╖╤Ц╨▓
Write-Host "╨Ъ╤А╨╛╨║ 3: ╨Я╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤П ╨╛╨▒╤А╨░╨╖╤Ц╨▓ ╨╜╨░ Docker Hub..." -ForegroundColor Yellow
Write-Host "╨ж╨╡ ╨╝╨╛╨╢╨╡ ╨╖╨░╨╣╨╜╤П╤В╨╕ ╨┤╨╡╨║╨╕╨╣ ╤З╨░╤Б..." -ForegroundColor Yellow
Write-Host ""

Write-Host "╨Ч╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П backend ╨╛╨▒╤А╨░╨╖╤Г..." -ForegroundColor Yellow
docker push $backendImage

if ($LASTEXITCODE -ne 0) {
    Write-Host "╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨┐╤А╨╕ ╨┐╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤Ч backend ╨╛╨▒╤А╨░╨╖╤Г!" -ForegroundColor Red
    exit 1
}

Write-Host "тЬУ Backend ╨╛╨▒╤А╨░╨╖ ╨╛╨┐╤Г╨▒╨╗╤Ц╨║╨╛╨▓╨░╨╜╨╛" -ForegroundColor Green
Write-Host ""

Write-Host "╨Ч╨░╨▓╨░╨╜╤В╨░╨╢╨╡╨╜╨╜╤П frontend ╨╛╨▒╤А╨░╨╖╤Г..." -ForegroundColor Yellow
docker push $frontendImage

if ($LASTEXITCODE -ne 0) {
    Write-Host "╨Я╨╛╨╝╨╕╨╗╨║╨░ ╨┐╤А╨╕ ╨┐╤Г╨▒╨╗╤Ц╨║╨░╤Ж╤Ц╤Ч frontend ╨╛╨▒╤А╨░╨╖╤Г!" -ForegroundColor Red
    exit 1
}

Write-Host "тЬУ Frontend ╨╛╨▒╤А╨░╨╖ ╨╛╨┐╤Г╨▒╨╗╤Ц╨║╨╛╨▓╨░╨╜╨╛" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "╨У╨╛╤В╨╛╨▓╨╛! ╨Ю╨▒╤А╨░╨╖╤Ц ╨╛╨┐╤Г╨▒╨╗╤Ц╨║╨╛╨▓╨░╨╜╤Ц" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "╨Ф╨╗╤П ╨▓╨╕╨║╨╛╤А╨╕╤Б╤В╨░╨╜╨╜╤П ╨╜╨░ ╤Ц╨╜╤И╨╛╨╝╤Г ╨┐╤А╨╕╤Б╤В╤А╨╛╤Ч:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ╨Ю╨╜╨╛╨▓╤Ц╤В╤М docker-compose.yml:" -ForegroundColor Cyan
Write-Host "   ╨Ч╨░╨╝╤Ц╨╜╤Ц╤В╤М 'build:' ╨╜╨░ 'image: ${DockerHubUsername}/automation-backend:$Tag'" -ForegroundColor White
Write-Host "   ╨Ч╨░╨╝╤Ц╨╜╤Ц╤В╤М 'build:' ╨╜╨░ 'image: ${DockerHubUsername}/automation-frontend:$Tag'" -ForegroundColor White
Write-Host ""
Write-Host "2. ╨Р╨▒╨╛ ╨▓╨╕╨║╨╛╨╜╨░╨╣╤В╨╡:" -ForegroundColor Cyan
Write-Host "   docker pull ${DockerHubUsername}/automation-backend:$Tag" -ForegroundColor White
Write-Host "   docker pull ${DockerHubUsername}/automation-frontend:$Tag" -ForegroundColor White
Write-Host ""
Write-Host "3. ╨Ч╨░╨┐╤Г╤Б╤В╤Ц╤В╤М:" -ForegroundColor Cyan
Write-Host "   docker-compose up -d" -ForegroundColor White
Write-Host ""