# إيقاف السيرفر الخلفي
Set-Location $PSScriptRoot
$pidFile = Join-Path $PSScriptRoot ".server.pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "لا يوجد سيرفر مسجّل." -ForegroundColor Yellow
    exit 0
}

$pid = Get-Content $pidFile
if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
    Stop-Process -Id $pid -Force
    Write-Host "تم الإيقاف (PID $pid)" -ForegroundColor Green
} else {
    Write-Host "العملية غير موجودة." -ForegroundColor Yellow
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
