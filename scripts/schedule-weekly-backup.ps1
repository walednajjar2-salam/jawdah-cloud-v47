# Register weekly offsite backup for Launch Quality (Sunday 9:00 AM).
param(
    [string]$BaseUrl = "https://web-production-08d73.up.railway.app",
    [string]$Username = "admin",
    [string]$DestRoot = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$taskName = "LaunchQuality-WeeklyBackup"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupScript = Join-Path $scriptDir "download_offsite_backup.ps1"

if (-not (Test-Path $backupScript)) {
    Write-Error "Missing script: $backupScript"
}

$password = $env:LAUNCH_QUALITY_OWNER_PASSWORD
if (-not $password) {
    $secure = Read-Host "Owner password for $Username" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$destArg = if ($DestRoot) { "-DestRoot `"$DestRoot`"" } else { "" }
$baseArg = "-BaseUrl `"$BaseUrl`""
$userArg = "-Username `"$Username`""
$passArg = "-Password `"$password`""
$actionArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" $baseArg $userArg $passArg $destArg -RunBackupFirst"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs.Trim()
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "09:00"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and -not $Force) {
    Write-Host "Task '$taskName' already exists. Re-run with -Force to replace it." -ForegroundColor Yellow
    exit 0
}
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Weekly Launch Quality offsite backup to OneDrive" | Out-Null
Write-Host "Registered '$taskName' — Sundays 9:00 AM" -ForegroundColor Green
Write-Host "Runs: $backupScript" -ForegroundColor Cyan
