# تشغيل Launch Quality في الخلفية
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$pidFile = Join-Path $PSScriptRoot ".server.pid"

if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        Write-Host "السيرفر يعمل بالفعل (PID $oldPid)" -ForegroundColor Yellow
        Write-Host "http://localhost:8765"
        exit 0
    }
}

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

if (-not (Test-Path "data")) { New-Item -ItemType Directory -Path "data" | Out-Null }

$python = $null
foreach ($cmd in @("py", "python")) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $python = $cmd; break }
}
if (-not $python) {
    $direct = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    if (Test-Path $direct) { $python = $direct }
}
if (-not $python) {
    Write-Host "Python غير موجود. ثبّته أولاً." -ForegroundColor Red
    exit 1
}

$proc = Start-Process -FilePath $python -ArgumentList "server.py" `
    -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru

$proc.Id | Set-Content $pidFile

Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8765/api/health" -TimeoutSec 5
    Write-Host "تم التشغيل في الخلفية (PID $($proc.Id))" -ForegroundColor Green
    Write-Host "http://localhost:8765" -ForegroundColor Cyan
    Write-Host "admin / admin123" -ForegroundColor Gray
} catch {
    Write-Host "تعذّر التحقق من السيرفر." -ForegroundColor Red
    exit 1
}
