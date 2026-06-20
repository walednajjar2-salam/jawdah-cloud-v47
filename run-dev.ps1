# Launch Quality LLC — تشغيل محلي للتطوير (بدون رفع)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# تحميل متغيرات .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

# إنشاء مجلد البيانات
$dataDir = if ($env:JAWDAH_DATA_DIR) { $env:JAWDAH_DATA_DIR } else { "./data" }
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

# البحث عن Python
$python = $null
foreach ($cmd in @("py", "python", "python3")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $python = $cmd
        break
    }
}
if (-not $python) {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { $python = $p; break }
    }
}

if (-not $python) {
    Write-Host ""
    Write-Host "Python غير مثبت." -ForegroundColor Red
    Write-Host "ثبّته من: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "أو نفّذ: winget install Python.Python.3.12" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$port = if ($env:JAWDAH_PORT) { $env:JAWDAH_PORT } else { "8765" }
Write-Host ""
Write-Host "Launch Quality LLC — وضع التطوير المحلي" -ForegroundColor Cyan
Write-Host "افتح المتصفح: http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "تسجيل الدخول: admin / admin123" -ForegroundColor Gray
Write-Host "للإيقاف: Ctrl+C" -ForegroundColor Gray
Write-Host ""

& $python server.py
